package car.repair.shop.team;

import car.repair.shop.team.controller.dto.LeaveWarning;
import car.repair.shop.team.exception.TeamErrorCode;
import car.repair.shop.team.exception.TeamException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;

/**
 * Rules for saving a leave (plan §3.4). Hard rules reject the request, checked in a fixed order;
 * an exceeded pool only produces a warning (owner decision D4) and the save goes through.
 */
final class LeavePolicy {
    /** Sanity limit, inclusive calendar days - catches typos like 2026 → 2027 in the end year. */
    static final int MAX_CALENDAR_DAYS = 60;

    private LeavePolicy() {
    }

    /**
     * @param employeeLeaves the employee's saved leave
     * @param editedLeaveId  id of the leave being updated (left out of the overlap check), or null
     */
    static void validate(LocalDate start, LocalDate end, Collection<Leave> employeeLeaves, String editedLeaveId,
                         LocalDate today) {
        if (start == null || end == null) {
            throw new TeamException(TeamErrorCode.INVALID_RANGE, "Start and end date are required");
        }
        if (end.isBefore(start)) {
            throw new TeamException(TeamErrorCode.INVALID_RANGE, "End date is before start date");
        }
        if (ChronoUnit.DAYS.between(start, end) + 1 > MAX_CALENDAR_DAYS) {
            throw new TeamException(TeamErrorCode.INVALID_RANGE, "Leave is longer than " + MAX_CALENDAR_DAYS + " days");
        }
        if (WorkingDays.count(start, end) == 0) {
            throw new TeamException(TeamErrorCode.NO_WORKING_DAYS, "Range has no working days");
        }
        if (end.getYear() > today.getYear() + 1) {
            throw new TeamException(TeamErrorCode.TOO_FAR_AHEAD, "Leave can be planned until the end of next year");
        }
        boolean overlaps = employeeLeaves.stream()
                .filter(other -> !other.getId().equals(editedLeaveId))
                .anyMatch(other -> !start.isAfter(other.getEndDate()) && !end.isBefore(other.getStartDate()));
        if (overlaps) {
            throw new TeamException(TeamErrorCode.LEAVE_OVERLAP, "Employee already has leave in this period");
        }
    }

    /**
     * {@code POOL_EXCEEDED} for every year of {@code [start, end]} whose remaining is below zero.
     *
     * @param leavesAfterSave the employee's leave including the one just saved
     */
    static List<LeaveWarning> poolWarnings(Employee employee, Collection<Leave> leavesAfterSave,
                                           LocalDate start, LocalDate end, LocalDate today) {
        return WorkingDays.countByYear(start, end).keySet().stream()
                .map(year -> LeaveBalanceCalculator.balance(employee, leavesAfterSave, year, today))
                .filter(balance -> balance.remaining() < 0)
                .map(balance -> new LeaveWarning(LeaveWarning.POOL_EXCEEDED, balance.year(), balance.remaining()))
                .toList();
    }
}
