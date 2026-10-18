package car.repair.shop.team;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WorkingDaysTest {

    @Test
    void mondayToFriday_isFiveDays() {
        assertThat(WorkingDays.count(LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 6))).isEqualTo(5);
    }

    @Test
    void weekendOnly_isZero() {
        assertThat(WorkingDays.count(LocalDate.of(2026, 11, 14), LocalDate.of(2026, 11, 15))).isZero();
    }

    @Test
    void singleWeekday_isOne() {
        assertThat(WorkingDays.count(LocalDate.of(2026, 11, 4), LocalDate.of(2026, 11, 4))).isEqualTo(1);
    }

    @Test
    void endBeforeStart_isZero() {
        assertThat(WorkingDays.count(LocalDate.of(2026, 11, 6), LocalDate.of(2026, 11, 2))).isZero();
    }

    @Test
    void publicHoliday_isCharged() {
        // 9-13 Nov 2026 contains 11 Nov (Independence Day, a Wednesday); the shop knows no holidays (D5)
        assertThat(WorkingDays.count(LocalDate.of(2026, 11, 9), LocalDate.of(2026, 11, 13))).isEqualTo(5);
    }

    @Test
    void leaveOverNewYear_isSplitByCalendarYear() {
        var byYear = WorkingDays.countByYear(LocalDate.of(2026, 12, 28), LocalDate.of(2027, 1, 8));

        assertThat(byYear).containsExactlyEntriesOf(Map.of(2026, 4, 2027, 6));
    }

    @Test
    void countByYear_leavesOutYearsWithoutWorkingDays() {
        // Fri 31 Dec 2027 - Sun 2 Jan 2028: the 2028 part is weekend only, so 2028 is not listed
        var byYear = WorkingDays.countByYear(LocalDate.of(2027, 12, 31), LocalDate.of(2028, 1, 2));

        assertThat(byYear).containsExactlyEntriesOf(Map.of(2027, 1));
    }

    @Test
    void countInYear_onlyCountsDaysInsideThatYear() {
        var from = LocalDate.of(2026, 12, 28);
        var to = LocalDate.of(2027, 1, 8);

        assertThat(WorkingDays.countInYear(from, to, 2026)).isEqualTo(4);
        assertThat(WorkingDays.countInYear(from, to, 2027)).isEqualTo(6);
        assertThat(WorkingDays.countInYear(from, to, 2028)).isZero();
    }

    @Test
    void countByMonth_putsDaysInTheirMonth() {
        var months = WorkingDays.countByMonth(LocalDate.of(2026, 10, 20), LocalDate.of(2026, 10, 23), 2026);

        assertThat(months[9]).isEqualTo(4);
        assertThat(months).containsExactly(0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0);
    }

    @Test
    void countByMonth_splitsAcrossMonthsAndIgnoresOtherYears() {
        // Wed 28 Oct - Fri 6 Nov 2026: 3 days in October, 5 in November
        var months = WorkingDays.countByMonth(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 6), 2026);
        var nextYear = WorkingDays.countByMonth(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 6), 2027);

        assertThat(months[9]).isEqualTo(3);
        assertThat(months[10]).isEqualTo(5);
        assertThat(nextYear).containsOnly(0);
    }
}
