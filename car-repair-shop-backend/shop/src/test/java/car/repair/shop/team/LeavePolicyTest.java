package car.repair.shop.team;

import car.repair.shop.team.exception.TeamErrorCode;
import car.repair.shop.team.exception.TeamException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LeavePolicyTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);
    private static final List<Leave> NONE = List.of();

    @Test
    void missingDates_areInvalidRange() {
        assertRejected(null, date("2026-11-06"), NONE, TeamErrorCode.INVALID_RANGE);
        assertRejected(date("2026-11-02"), null, NONE, TeamErrorCode.INVALID_RANGE);
    }

    @Test
    void endBeforeStart_isInvalidRange() {
        assertRejected(date("2026-11-06"), date("2026-11-02"), NONE, TeamErrorCode.INVALID_RANGE);
    }

    @Test
    void sixtyCalendarDays_isAllowed_sixtyOneIsNot() {
        var start = date("2026-11-02");

        assertAllowed(start, start.plusDays(59), NONE);
        assertRejected(start, start.plusDays(60), NONE, TeamErrorCode.INVALID_RANGE);
    }

    @Test
    void weekendOnly_hasNoWorkingDays() {
        assertRejected(date("2026-11-14"), date("2026-11-15"), NONE, TeamErrorCode.NO_WORKING_DAYS);
    }

    @Test
    void planningHorizon_endsWithNextYear() {
        assertAllowed(date("2027-12-27"), date("2027-12-31"), NONE);
        assertRejected(date("2027-12-27"), date("2028-01-03"), NONE, TeamErrorCode.TOO_FAR_AHEAD);
    }

    @Test
    void pastLeave_isAllowed() {
        assertAllowed(date("2026-03-02"), date("2026-03-06"), NONE);
    }

    @Test
    void overlapByOneDay_isRejected() {
        var existing = List.of(leave("a", "2026-11-16", "2026-11-18"));

        assertRejected(date("2026-11-18"), date("2026-11-20"), existing, TeamErrorCode.LEAVE_OVERLAP);
        assertRejected(date("2026-11-12"), date("2026-11-16"), existing, TeamErrorCode.LEAVE_OVERLAP);
    }

    @Test
    void adjacentLeave_isAllowed() {
        var existing = List.of(leave("a", "2026-11-16", "2026-11-18"));

        assertAllowed(date("2026-11-19"), date("2026-11-20"), existing);
        assertAllowed(date("2026-11-09"), date("2026-11-13"), existing);
    }

    @Test
    void editedLeave_isNotComparedWithItself() {
        var existing = List.of(leave("edited", "2026-11-16", "2026-11-20"), leave("other", "2026-11-23", "2026-11-24"));

        assertThatCode(() -> LeavePolicy.validate(date("2026-11-16"), date("2026-11-18"), existing, "edited", TODAY))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> LeavePolicy.validate(date("2026-11-16"), date("2026-11-23"), existing, "edited", TODAY))
                .isInstanceOf(TeamException.class)
                .extracting(e -> ((TeamException) e).getCode())
                .isEqualTo(TeamErrorCode.LEAVE_OVERLAP);
    }

    @Test
    void rangeRules_comeBeforeOverlap() {
        var existing = List.of(leave("a", "2026-11-14", "2026-11-15"));

        assertRejected(date("2026-11-14"), date("2026-11-15"), existing, TeamErrorCode.NO_WORKING_DAYS);
    }

    private static void assertAllowed(LocalDate start, LocalDate end, List<Leave> existing) {
        assertThatCode(() -> LeavePolicy.validate(start, end, existing, null, TODAY)).doesNotThrowAnyException();
    }

    private static void assertRejected(LocalDate start, LocalDate end, List<Leave> existing, TeamErrorCode code) {
        assertThatThrownBy(() -> LeavePolicy.validate(start, end, existing, null, TODAY))
                .isInstanceOf(TeamException.class)
                .extracting(e -> ((TeamException) e).getCode())
                .isEqualTo(code);
    }

    private static LocalDate date(String value) {
        return LocalDate.parse(value);
    }

    private static Leave leave(String id, String start, String end) {
        var leave = new Leave();
        leave.setId(id);
        leave.setStartDate(date(start));
        leave.setEndDate(date(end));
        return leave;
    }
}
