package car.repair.shop.team;

import car.repair.shop.team.controller.dto.EmployeeCommand;
import car.repair.shop.team.controller.dto.EmployeeListView;
import car.repair.shop.team.controller.dto.EmployeeView;
import car.repair.shop.team.controller.dto.LeaveCommand;
import car.repair.shop.team.controller.dto.LeaveSaveResult;
import car.repair.shop.team.controller.dto.LeaveView;
import car.repair.shop.team.controller.dto.PoolCommand;
import car.repair.shop.team.controller.dto.YearReport;
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
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.StreamSupport;

/**
 * Public API of the team module: employees, their yearly leave pools, leave, balances and reports.
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
     * Leave for the Urlopy screen. Exactly one mode: {@code from}+{@code to} (any employee, overlapping
     * the range - the calendar asks for its visible grid) or {@code employeeId}+{@code year} (that
     * employee's leave with at least one working day in the year).
     */
    public List<LeaveView> listLeaves(String from, String to, String employeeId, String year) {
        boolean byRange = from != null && to != null && employeeId == null && year == null;
        boolean byEmployee = employeeId != null && year != null && from == null && to == null;
        if (byRange) {
            var rangeStart = parseQueryDate(from);
            var rangeEnd = parseQueryDate(to);
            if (rangeEnd.isBefore(rangeStart)) {
                throw new TeamException(TeamErrorCode.INVALID_QUERY, "'to' is before 'from'");
            }
            return allLeaves().stream()
                    .filter(leave -> !leave.getStartDate().isAfter(rangeEnd) && !leave.getEndDate().isBefore(rangeStart))
                    .sorted(Comparator.comparing(Leave::getStartDate).thenComparing(Leave::getEmployeeId))
                    .map(TeamFacade::leaveView)
                    .toList();
        }
        if (byEmployee) {
            findEmployee(employeeId);
            int leaveYear = parseYear(year);
            return leavesOf(employeeId).stream()
                    .filter(leave -> WorkingDays.countInYear(leave.getStartDate(), leave.getEndDate(), leaveYear) > 0)
                    .sorted(Comparator.comparing(Leave::getStartDate))
                    .map(TeamFacade::leaveView)
                    .toList();
        }
        throw new TeamException(TeamErrorCode.INVALID_QUERY, "Use either from+to or employeeId+year");
    }

    public LeaveSaveResult createLeave(LeaveCommand command) {
        if (command.employeeId() == null) {
            throw new TeamException(TeamErrorCode.EMPLOYEE_NOT_FOUND, "Employee not found");
        }
        var employee = findEmployee(command.employeeId());
        var otherLeaves = leavesOf(employee.getId());
        LeavePolicy.validate(command.startDate(), command.endDate(), otherLeaves, null, today());

        var leave = new Leave();
        leave.setEmployeeId(employee.getId());
        leave.setStartDate(command.startDate());
        leave.setEndDate(command.endDate());
        leave.setCreatedAt(nowUtc());
        leave.setUpdatedAt(leave.getCreatedAt());
        var saved = leaveRepository.save(leave);

        var years = new TreeSet<>(WorkingDays.countByYear(saved.getStartDate(), saved.getEndDate()).keySet());
        return saveResult(employee, saved, withSaved(otherLeaves, saved), years);
    }

    /** Moves the dates of a leave. The employee can't change - delete the leave and add a new one instead. */
    public LeaveSaveResult updateLeave(String id, LeaveCommand command) {
        var leave = findLeave(id);
        if (command.employeeId() != null && !command.employeeId().equals(leave.getEmployeeId())) {
            throw new TeamException(TeamErrorCode.EMPLOYEE_CHANGE_NOT_ALLOWED, "Leave can't be moved to another employee");
        }
        var employee = findEmployee(leave.getEmployeeId());
        var otherLeaves = leavesOf(employee.getId()).stream().filter(other -> !other.getId().equals(id)).toList();
        LeavePolicy.validate(command.startDate(), command.endDate(), otherLeaves, id, today());

        // the balance of the years the leave left must be returned too
        var years = new TreeSet<>(WorkingDays.countByYear(leave.getStartDate(), leave.getEndDate()).keySet());
        leave.setStartDate(command.startDate());
        leave.setEndDate(command.endDate());
        leave.setUpdatedAt(nowUtc());
        var saved = leaveRepository.save(leave);

        years.addAll(WorkingDays.countByYear(saved.getStartDate(), saved.getEndDate()).keySet());
        return saveResult(employee, saved, withSaved(otherLeaves, saved), years);
    }

    public void deleteLeave(String id) {
        findLeave(id);
        leaveRepository.deleteById(id);
    }

    /** @param year 4-digit year, or null/blank for the current year */
    public YearReport yearReport(String employeeId, String year) {
        var employee = findEmployee(employeeId);
        var today = today();
        int reportYear = year == null || year.isBlank() ? today.getYear() : parseYear(year);
        return YearReportBuilder.build(employee, leavesOf(employeeId), reportYear, today);
    }

    /**
     * Balances come from the in-memory list (other leave + the saved one), not a fresh scan: a DynamoDB
     * scan right after a write is only eventually consistent and could miss the row just saved.
     */
    private LeaveSaveResult saveResult(Employee employee, Leave saved, List<Leave> leavesAfterSave, SortedSet<Integer> years) {
        var today = today();
        var balances = years.stream()
                .map(year -> LeaveBalanceCalculator.balance(employee, leavesAfterSave, year, today))
                .toList();
        var warnings = LeavePolicy.poolWarnings(employee, leavesAfterSave, saved.getStartDate(), saved.getEndDate(), today);
        return new LeaveSaveResult(leaveView(saved), balances, warnings);
    }

    private static List<Leave> withSaved(List<Leave> otherLeaves, Leave saved) {
        var leaves = new ArrayList<>(otherLeaves);
        leaves.add(saved);
        return leaves;
    }

    private static LeaveView leaveView(Leave leave) {
        var byYear = WorkingDays.countByYear(leave.getStartDate(), leave.getEndDate());
        int total = byYear.values().stream().mapToInt(Integer::intValue).sum();
        return new LeaveView(leave.getId(), leave.getEmployeeId(), leave.getStartDate(), leave.getEndDate(), total, byYear);
    }

    private static LocalDate parseQueryDate(String value) {
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new TeamException(TeamErrorCode.INVALID_QUERY, "Dates must be YYYY-MM-DD");
        }
    }

    private Leave findLeave(String id) {
        return leaveRepository.findById(id)
                .orElseThrow(() -> new TeamException(TeamErrorCode.LEAVE_NOT_FOUND, "Leave not found"));
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
