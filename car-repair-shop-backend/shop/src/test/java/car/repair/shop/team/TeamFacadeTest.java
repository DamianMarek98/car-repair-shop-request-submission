package car.repair.shop.team;

import car.repair.shop.team.controller.dto.EmployeeCommand;
import car.repair.shop.team.controller.dto.PoolCommand;
import car.repair.shop.team.exception.TeamErrorCode;
import car.repair.shop.team.exception.TeamException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TeamFacadeTest {
    private static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Warsaw");
    private static final Clock CLOCK = Clock.fixed(
            LocalDate.of(2026, 11, 2).atTime(10, 0).atZone(SHOP_ZONE).toInstant(), SHOP_ZONE);

    private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
    private final LeaveRepository leaveRepository = mock(LeaveRepository.class);
    private final TeamFacade teamFacade = new TeamFacade(employeeRepository, leaveRepository, CLOCK);

    private final List<Employee> employees = new ArrayList<>();
    private final List<Leave> leaves = new ArrayList<>();

    @BeforeEach
    void stubRepositories() {
        when(employeeRepository.findAll()).thenReturn(employees);
        when(leaveRepository.findAll()).thenReturn(leaves);
        when(employeeRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void create_takesLowestFreeColorIndex_includingAGap() {
        employees.add(employee("a", 0, 26));
        employees.add(employee("b", 2, 26));

        var view = teamFacade.createEmployee(new EmployeeCommand("Jan", "Testowy", null));

        assertThat(view.colorIndex()).isEqualTo(1);
    }

    @Test
    void create_wrapsColorIndexWhenPaletteIsFull() {
        for (int i = 0; i < TeamFacade.PALETTE_SIZE; i++) {
            employees.add(employee("e" + i, i, 26));
        }

        var view = teamFacade.createEmployee(new EmployeeCommand("Jan", "Testowy", null));

        assertThat(view.colorIndex()).isZero();
    }

    @Test
    void create_trimsNamesAndDefaultsPoolTo26() {
        var view = teamFacade.createEmployee(new EmployeeCommand("  Jan ", " Testowy", null));

        assertThat(view.firstName()).isEqualTo("Jan");
        assertThat(view.lastName()).isEqualTo("Testowy");
        assertThat(view.defaultAnnualDays()).isEqualTo(26);
    }

    @Test
    void names_mustBe1To60Characters() {
        var sixty = "a".repeat(60);

        assertThat(teamFacade.createEmployee(new EmployeeCommand(sixty, "Testowy", null)).firstName()).hasSize(60);
        assertRejected(() -> teamFacade.createEmployee(new EmployeeCommand(sixty + "a", "Testowy", null)), TeamErrorCode.INVALID_NAME);
        assertRejected(() -> teamFacade.createEmployee(new EmployeeCommand("Jan", null, null)), TeamErrorCode.INVALID_NAME);
        assertRejected(() -> teamFacade.createEmployee(new EmployeeCommand(" ", "Testowy", null)), TeamErrorCode.INVALID_NAME);
    }

    @Test
    void pool_accepts0And365_rejectsOutsideRange() {
        assertThat(teamFacade.createEmployee(new EmployeeCommand("Jan", "Testowy", 0)).defaultAnnualDays()).isZero();
        assertThat(teamFacade.createEmployee(new EmployeeCommand("Jan", "Testowy", 365)).defaultAnnualDays()).isEqualTo(365);
        assertRejected(() -> teamFacade.createEmployee(new EmployeeCommand("Jan", "Testowy", -1)), TeamErrorCode.INVALID_POOL);
        assertRejected(() -> teamFacade.createEmployee(new EmployeeCommand("Jan", "Testowy", 366)), TeamErrorCode.INVALID_POOL);
    }

    @Test
    void defaultChange_freezesOldDefaultOnlyIntoPastUntypedYearsWithLeave() {
        var employee = employee("k", 0, 26);
        employee.getAnnualDaysByYear().put("2026", 9);
        employees.add(employee);
        when(employeeRepository.findById("k")).thenReturn(Optional.of(employee));
        leaves.add(leave("k", "2025-07-07", "2025-07-11"));   // past, untyped  -> frozen at 26
        leaves.add(leave("k", "2026-10-19", "2026-10-23"));   // current, typed -> stays 9
        leaves.add(leave("k", "2027-03-01", "2027-03-05"));   // future         -> follows the new default
        leaves.add(leave("other", "2024-05-06", "2024-05-10")); // someone else's leave is ignored

        teamFacade.updateEmployee("k", new EmployeeCommand("Katarzyna", "Wiśniewska", 20));

        var saved = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepository).save(saved.capture());
        assertThat(saved.getValue().getDefaultAnnualDays()).isEqualTo(20);
        assertThat(saved.getValue().getAnnualDaysByYear()).containsExactlyInAnyOrderEntriesOf(Map.of("2025", 26, "2026", 9));
    }

    @Test
    void update_withoutDefault_keepsDefaultAndWritesNoPools() {
        var employee = employee("k", 0, 26);
        employees.add(employee);
        when(employeeRepository.findById("k")).thenReturn(Optional.of(employee));
        leaves.add(leave("k", "2025-07-07", "2025-07-11"));

        var view = teamFacade.updateEmployee("k", new EmployeeCommand("Kasia", "Wiśniewska", null));

        assertThat(view.defaultAnnualDays()).isEqualTo(26);
        assertThat(employee.getAnnualDaysByYear()).isEmpty();
    }

    @Test
    void setPool_null_removesTypedYear() {
        var employee = employee("t", 0, 26);
        employee.getAnnualDaysByYear().put("2026", 9);
        when(employeeRepository.findById("t")).thenReturn(Optional.of(employee));

        var view = teamFacade.setPool("t", "2026", new PoolCommand(null));

        assertThat(employee.getAnnualDaysByYear()).doesNotContainKey("2026");
        assertThat(view.balance().pool()).isEqualTo(26);
        assertThat(view.balance().poolIsDefault()).isTrue();
    }

    @Test
    void year_mustBe2000To2100() {
        assertRejected(() -> teamFacade.listEmployees("1999"), TeamErrorCode.INVALID_YEAR);
        assertRejected(() -> teamFacade.listEmployees("2101"), TeamErrorCode.INVALID_YEAR);
        assertRejected(() -> teamFacade.listEmployees("20x6"), TeamErrorCode.INVALID_YEAR);
        assertThat(teamFacade.listEmployees("2000").year()).isEqualTo(2000);
    }

    @Test
    void list_availableYearsIncludeEarliestTypedPool() {
        var employee = employee("t", 0, 26);
        employee.getAnnualDaysByYear().put("2023", 20);
        employees.add(employee);

        assertThat(teamFacade.listEmployees(null).availableYears()).containsExactly(2023, 2024, 2025, 2026, 2027);
    }

    @Test
    void unknownEmployee_isRejected() {
        when(employeeRepository.findById("missing")).thenReturn(Optional.empty());

        assertRejected(() -> teamFacade.deleteEmployee("missing"), TeamErrorCode.EMPLOYEE_NOT_FOUND);
    }

    private static void assertRejected(Runnable call, TeamErrorCode code) {
        assertThatThrownBy(call::run)
                .isInstanceOf(TeamException.class)
                .extracting(e -> ((TeamException) e).getCode())
                .isEqualTo(code);
    }

    private static Employee employee(String id, int colorIndex, int defaultDays) {
        var employee = new Employee();
        employee.setId(id);
        employee.setFirstName("First " + id);
        employee.setLastName("Last " + id);
        employee.setColorIndex(colorIndex);
        employee.setDefaultAnnualDays(defaultDays);
        employee.setAnnualDaysByYear(new HashMap<>());
        return employee;
    }

    private static Leave leave(String employeeId, String start, String end) {
        var leave = new Leave();
        leave.setEmployeeId(employeeId);
        leave.setStartDate(LocalDate.parse(start));
        leave.setEndDate(LocalDate.parse(end));
        return leave;
    }
}
