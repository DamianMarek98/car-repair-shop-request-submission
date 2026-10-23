package car.repair.shop.team;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveBalanceCalculatorTest {
    // Monday - the fixed "today" of the local test scenario (plan §6.0)
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);

    @Test
    void typedPool_beatsDefault() {
        var employee = employee(26, Map.of("2026", 9));

        var balance = LeaveBalanceCalculator.balance(employee, List.of(), 2026, TODAY);

        assertThat(balance.pool()).isEqualTo(9);
        assertThat(balance.poolIsDefault()).isFalse();
        assertThat(balance.remaining()).isEqualTo(9);
    }

    @Test
    void untypedYear_usesDefault() {
        var employee = employee(26, Map.of("2026", 9));

        var balance = LeaveBalanceCalculator.balance(employee, List.of(), 2027, TODAY);

        assertThat(balance.pool()).isEqualTo(26);
        assertThat(balance.poolIsDefault()).isTrue();
    }

    @Test
    void leaveSpanningToday_splitsIntoTakenAndPlanned() {
        // Wed 28 Oct - Fri 6 Nov: 28-30 Oct before today, 2-6 Nov from today on
        var employee = employee(20, Map.of());

        var balance = LeaveBalanceCalculator.balance(employee, List.of(leave("2026-10-28", "2026-11-06")), 2026, TODAY);

        assertThat(balance.taken()).isEqualTo(3);
        assertThat(balance.planned()).isEqualTo(5);
        assertThat(balance.remaining()).isEqualTo(12);
    }

    @Test
    void leaveStartingToday_isPlanned() {
        var employee = employee(26, Map.of());

        var balance = LeaveBalanceCalculator.balance(employee, List.of(leave("2026-11-02", "2026-11-02")), 2026, TODAY);

        assertThat(balance.taken()).isZero();
        assertThat(balance.planned()).isEqualTo(1);
    }

    @Test
    void leaveOverNewYear_chargesEachYearSeparately() {
        var employee = employee(26, Map.of("2026", 9, "2027", 30));
        var leaves = List.of(leave("2026-10-20", "2026-10-23"), leave("2026-12-28", "2027-01-08"));

        var balance2026 = LeaveBalanceCalculator.balance(employee, leaves, 2026, TODAY);
        var balance2027 = LeaveBalanceCalculator.balance(employee, leaves, 2027, TODAY);

        assertThat(balance2026.taken()).isEqualTo(4);
        assertThat(balance2026.planned()).isEqualTo(4);
        assertThat(balance2026.remaining()).isEqualTo(1);
        assertThat(balance2027.taken()).isZero();
        assertThat(balance2027.planned()).isEqualTo(6);
        assertThat(balance2027.remaining()).isEqualTo(24);
    }

    @Test
    void remaining_canGoNegative() {
        var employee = employee(26, Map.of("2026", 3));

        var balance = LeaveBalanceCalculator.balance(employee, List.of(leave("2026-11-16", "2026-11-20")), 2026, TODAY);

        assertThat(balance.planned()).isEqualTo(5);
        assertThat(balance.remaining()).isEqualTo(-2);
    }

    @Test
    void leaveOfOtherYears_isIgnored() {
        var employee = employee(26, Map.of());

        var balance = LeaveBalanceCalculator.balance(employee, List.of(leave("2025-07-07", "2025-07-11")), 2026, TODAY);

        assertThat(balance.taken()).isZero();
        assertThat(balance.planned()).isZero();
        assertThat(balance.remaining()).isEqualTo(26);
    }

    private static Employee employee(int defaultDays, Map<String, Integer> typedPools) {
        var employee = new Employee();
        employee.setDefaultAnnualDays(defaultDays);
        employee.setAnnualDaysByYear(new HashMap<>(typedPools));
        return employee;
    }

    private static Leave leave(String start, String end) {
        var leave = new Leave();
        leave.setStartDate(LocalDate.parse(start));
        leave.setEndDate(LocalDate.parse(end));
        return leave;
    }
}
