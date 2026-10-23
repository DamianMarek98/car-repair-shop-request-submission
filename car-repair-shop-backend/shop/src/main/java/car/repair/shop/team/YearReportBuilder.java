package car.repair.shop.team;

import car.repair.shop.team.controller.dto.YearReport;
import car.repair.shop.team.controller.dto.YearReport.ReportEmployee;
import car.repair.shop.team.controller.dto.YearReport.ReportLeave;
import car.repair.shop.team.controller.dto.YearReport.Status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;

/** Builds Raport roczny from the same calculator as the Zespół table, so the two can't disagree. */
final class YearReportBuilder {
    private YearReportBuilder() {
    }

    static YearReport build(Employee employee, Collection<Leave> leaves, int year, LocalDate today) {
        var balance = LeaveBalanceCalculator.balance(employee, leaves, year, today);
        var months = new int[12];
        var reportLeaves = new ArrayList<ReportLeave>();

        leaves.stream().sorted(Comparator.comparing(Leave::getStartDate)).forEach(leave -> {
            int daysInYear = WorkingDays.countInYear(leave.getStartDate(), leave.getEndDate(), year);
            if (daysInYear == 0) {
                return;
            }
            var leaveMonths = WorkingDays.countByMonth(leave.getStartDate(), leave.getEndDate(), year);
            for (int month = 0; month < 12; month++) {
                months[month] += leaveMonths[month];
            }
            reportLeaves.add(new ReportLeave(leave.getStartDate(), leave.getEndDate(), daysInYear, status(leave, today)));
        });

        return new YearReport(
                new ReportEmployee(employee.getId(), employee.getFirstName(), employee.getLastName()),
                year, today, balance.pool(), balance.poolIsDefault(), balance.taken(), balance.planned(),
                balance.remaining(), months, reportLeaves);
    }

    static Status status(Leave leave, LocalDate today) {
        if (leave.getEndDate().isBefore(today)) {
            return Status.TAKEN;
        }
        if (!leave.getStartDate().isBefore(today)) {
            return Status.PLANNED;
        }
        return Status.IN_PROGRESS;
    }
}
