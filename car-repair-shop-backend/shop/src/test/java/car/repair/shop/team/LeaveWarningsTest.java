package car.repair.shop.team;

import car.repair.shop.team.controller.dto.LeaveWarning;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveWarningsTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);

    @Test
    void overPoolInOneYear_givesOneWarningForThatYear() {
        var employee = employee(26, Map.of("2026", 3));
        var saved = leave("2026-11-16", "2026-11-20");

        var warnings = LeavePolicy.poolWarnings(employee, List.of(saved), saved.getStartDate(), saved.getEndDate(), TODAY);

        assertThat(warnings).containsExactly(new LeaveWarning(LeaveWarning.POOL_EXCEEDED, 2026, -2));
    }

    @Test
    void crossYearLeave_warnsOnlyForTheOverdrawnYear() {
        // 2026 has plenty left; 2027 is typed as 4 and the leave takes 6 days of it
        var employee = employee(26, Map.of("2027", 4));
        var saved = leave("2026-12-28", "2027-01-08");

        var warnings = LeavePolicy.poolWarnings(employee, List.of(saved), saved.getStartDate(), saved.getEndDate(), TODAY);

        assertThat(warnings).containsExactly(new LeaveWarning(LeaveWarning.POOL_EXCEEDED, 2027, -2));
    }

    @Test
    void remainingExactlyZero_givesNoWarning() {
        var employee = employee(26, Map.of("2026", 5));
        var saved = leave("2026-11-16", "2026-11-20");

        var warnings = LeavePolicy.poolWarnings(employee, List.of(saved), saved.getStartDate(), saved.getEndDate(), TODAY);

        assertThat(warnings).isEmpty();
    }

    @Test
    void yearsOutsideTheSavedRange_areNotWarnedAbout() {
        // 2027 is already overdrawn by an older leave, but the new leave only touches 2026
        var employee = employee(26, Map.of("2027", 1));
        var older = leave("2027-03-01", "2027-03-05");
        var saved = leave("2026-11-16", "2026-11-20");

        var warnings = LeavePolicy.poolWarnings(employee, List.of(older, saved), saved.getStartDate(), saved.getEndDate(), TODAY);

        assertThat(warnings).isEmpty();
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
