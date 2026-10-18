package car.repair.shop.team;

import car.repair.shop.team.controller.dto.EmployeeCommand;
import car.repair.shop.team.controller.dto.EmployeeListView;
import car.repair.shop.team.controller.dto.EmployeeView;
import car.repair.shop.team.controller.dto.PoolCommand;
import car.repair.shop.team.exception.TeamErrorCode;
import car.repair.shop.team.exception.TeamException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Collator;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.StreamSupport;

/**
 * Public API of the team module: employees, their yearly leave pools and balances.
 * <p>
 * Validation lives here rather than in Bean Validation annotations, so every rejection carries a
 * {@link TeamErrorCode} the portal can translate. One person edits this data at a time (owner
 * given), so there is no locking - last write wins.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeamFacade {
    static final int DEFAULT_ANNUAL_DAYS = 26;
    static final int MAX_POOL = 365;
    /** Number of worker colours in the portal palette. */
    static final int PALETTE_SIZE = 15;
    private static final int MAX_NAME_LENGTH = 60;
    private static final int MIN_YEAR = 2000;
    private static final int MAX_YEAR = 2100;

    private static final Collator POLISH = Collator.getInstance(Locale.forLanguageTag("pl-PL"));
    private static final Comparator<Employee> BY_NAME = Comparator
            .comparing(Employee::getLastName, POLISH)
            .thenComparing(Employee::getFirstName, POLISH);

    private final EmployeeRepository employeeRepository;
    private final LeaveRepository leaveRepository;
    private final Clock clock;

    /** @param year 4-digit year, or null/blank for the current year */
    public EmployeeListView listEmployees(String year) {
        var today = today();
        int selectedYear = year == null || year.isBlank() ? today.getYear() : parseYear(year);
        var employees = allEmployees();
        var leavesByEmployee = allLeaves().stream().collect(Collectors.groupingBy(Leave::getEmployeeId));

        var views = employees.stream()
                .sorted(BY_NAME)
                .map(employee -> view(employee, leavesByEmployee.getOrDefault(employee.getId(), List.of()), selectedYear, today))
                .toList();
        return new EmployeeListView(today, selectedYear, availableYears(employees, leavesByEmployee, today), views);
    }

    public EmployeeView createEmployee(EmployeeCommand command) {
        var employee = new Employee();
        employee.setFirstName(validName(command.firstName(), "First name"));
        employee.setLastName(validName(command.lastName(), "Last name"));
        employee.setDefaultAnnualDays(command.defaultAnnualDays() == null
                ? DEFAULT_ANNUAL_DAYS
                : validPool(command.defaultAnnualDays()));
        employee.setAnnualDaysByYear(new HashMap<>());
        employee.setColorIndex(firstFreeColorIndex(allEmployees()));
        employee.setCreatedAt(nowUtc());
        employee.setUpdatedAt(employee.getCreatedAt());

        var saved = employeeRepository.save(employee);
        log.info("Created employee {}", saved.getId());
        return view(saved, List.of(), today().getYear(), today());
    }

    public EmployeeView updateEmployee(String id, EmployeeCommand command) {
        var employee = findEmployee(id);
        var firstName = validName(command.firstName(), "First name");
        var lastName = validName(command.lastName(), "Last name");
        int oldDefault = employee.getDefaultAnnualDays();
        int newDefault = command.defaultAnnualDays() == null ? oldDefault : validPool(command.defaultAnnualDays());
        var leaves = leavesOf(id);

        if (newDefault != oldDefault) {
            keepPastYearsOnDefaultChange(employee, oldDefault, leaves);
        }
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        employee.setDefaultAnnualDays(newDefault);
        employee.setUpdatedAt(nowUtc());

        var saved = employeeRepository.save(employee);
        return view(saved, leaves, today().getYear(), today());
    }

    /** Types the pool for one year by hand; {@code days == null} goes back to the default pool. */
    public EmployeeView setPool(String id, String year, PoolCommand command) {
        var employee = findEmployee(id);
        int poolYear = parseYear(year);
        var pools = pools(employee);
        if (command == null || command.days() == null) {
            pools.remove(String.valueOf(poolYear));
        } else {
            pools.put(String.valueOf(poolYear), validPool(command.days()));
        }
        employee.setUpdatedAt(nowUtc());

        var saved = employeeRepository.save(employee);
        return view(saved, leavesOf(id), poolYear, today());
    }

    /** Hard delete (owner decision D7): the employee's leave first, then the employee. */
    public void deleteEmployee(String id) {
        findEmployee(id);
        // Leave first: if this fails midway the employee still exists and a repeated delete
        // finishes the job - leave rows are never orphaned.
        leavesOf(id).forEach(leave -> leaveRepository.deleteById(leave.getId()));
        employeeRepository.deleteById(id);
        log.info("Deleted employee {} with their leave", id);
    }

    /**
     * A year without a typed pool reads the current default, so changing the default would silently
     * rewrite past years. Freeze the old default into every year up to this one that has leave.
     */
    private void keepPastYearsOnDefaultChange(Employee employee, int oldDefault, List<Leave> leaves) {
        int currentYear = today().getYear();
        var pools = pools(employee);
        leaves.stream()
                .flatMap(leave -> WorkingDays.countByYear(leave.getStartDate(), leave.getEndDate()).keySet().stream())
                .filter(year -> year <= currentYear)
                .distinct()
                .forEach(year -> pools.putIfAbsent(String.valueOf(year), oldDefault));
    }

    private EmployeeView view(Employee employee, Collection<Leave> leaves, int year, LocalDate today) {
        return new EmployeeView(employee.getId(), employee.getFirstName(), employee.getLastName(),
                employee.getColorIndex(), employee.getDefaultAnnualDays(),
                LeaveBalanceCalculator.balance(employee, leaves, year, today));
    }

    private static List<Integer> availableYears(List<Employee> employees, Map<String, List<Leave>> leavesByEmployee,
                                                LocalDate today) {
        int first = today.getYear();
        for (var leaves : leavesByEmployee.values()) {
            for (var leave : leaves) {
                first = Math.min(first, leave.getStartDate().getYear());
            }
        }
        for (var employee : employees) {
            for (var typedYear : pools(employee).keySet()) {
                first = Math.min(first, Integer.parseInt(typedYear));
            }
        }
        return IntStream.rangeClosed(first, today.getYear() + 1).boxed().toList();
    }

    /** Lowest palette index nobody uses; wraps around once all 15 are taken (not expected). */
    private static int firstFreeColorIndex(List<Employee> employees) {
        var used = new HashSet<Integer>();
        employees.forEach(employee -> used.add(employee.getColorIndex()));
        return IntStream.range(0, PALETTE_SIZE)
                .filter(index -> !used.contains(index))
                .findFirst()
                .orElse(employees.size() % PALETTE_SIZE);
    }

    private static String validName(String name, String field) {
        var trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_NAME_LENGTH) {
            throw new TeamException(TeamErrorCode.INVALID_NAME,
                    field + " must be 1-" + MAX_NAME_LENGTH + " characters");
        }
        return trimmed;
    }

    private static int validPool(int days) {
        if (days < 0 || days > MAX_POOL) {
            throw new TeamException(TeamErrorCode.INVALID_POOL, "Pool must be 0-" + MAX_POOL + " days");
        }
        return days;
    }

    private static int parseYear(String year) {
        try {
            int parsed = Integer.parseInt(year.trim());
            if (parsed >= MIN_YEAR && parsed <= MAX_YEAR) {
                return parsed;
            }
        } catch (NumberFormatException ignored) {
            // falls through to the error below
        }
        throw new TeamException(TeamErrorCode.INVALID_YEAR, "Year must be " + MIN_YEAR + "-" + MAX_YEAR);
    }

    private static Map<String, Integer> pools(Employee employee) {
        if (employee.getAnnualDaysByYear() == null) {
            employee.setAnnualDaysByYear(new HashMap<>());
        }
        return employee.getAnnualDaysByYear();
    }

    private Employee findEmployee(String id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new TeamException(TeamErrorCode.EMPLOYEE_NOT_FOUND, "Employee not found"));
    }

    private List<Employee> allEmployees() {
        return StreamSupport.stream(employeeRepository.findAll().spliterator(), false).toList();
    }

    private List<Leave> allLeaves() {
        return StreamSupport.stream(leaveRepository.findAll().spliterator(), false).toList();
    }

    private List<Leave> leavesOf(String employeeId) {
        return allLeaves().stream().filter(leave -> employeeId.equals(leave.getEmployeeId())).toList();
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Timestamps are UTC without offset, like every other {@code *_at} in the repo. */
    private LocalDateTime nowUtc() {
        return LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
    }
}
