package car.repair.shop.team;

import car.repair.shop.team.controller.dto.Balance;

import java.time.LocalDate;
import java.util.Collection;

/**
 * Computes a yearly balance from the stored pool and leave dates. Nothing derived is ever stored,
 * so balances can't drift from the leave they come from.
 */
final class LeaveBalanceCalculator {
    private LeaveBalanceCalculator() {
    }

    /**
     * @param leaves the employee's leave (any years; other years contribute nothing)
     * @param today  the shop's today - days before it are taken, today and later are planned
     */
    static Balance balance(Employee employee, Collection<Leave> leaves, int year, LocalDate today) {
        var typedPool = employee.typedPool(year);
        int pool = typedPool != null ? typedPool : employee.getDefaultAnnualDays();

        var yearStart = LocalDate.of(year, 1, 1);
        var yearEnd = LocalDate.of(year, 12, 31);
        int taken = 0;
        int planned = 0;
        for (var leave : leaves) {
            var from = WorkingDays.max(leave.getStartDate(), yearStart);
            var to = WorkingDays.min(leave.getEndDate(), yearEnd);
            taken += WorkingDays.count(from, WorkingDays.min(to, today.minusDays(1)));
            planned += WorkingDays.count(WorkingDays.max(from, today), to);
        }
        return new Balance(year, pool, typedPool == null, taken, planned, pool - taken - planned);
    }
}
