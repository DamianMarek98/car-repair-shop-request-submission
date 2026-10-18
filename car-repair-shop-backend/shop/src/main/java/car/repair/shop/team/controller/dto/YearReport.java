package car.repair.shop.team.controller.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Raport roczny: one employee, one year. Totals equal the Zespół balance; {@code months} holds working
 * days per month (index 0 = January); each leave lists only the days it has inside {@code year}.
 */
public record YearReport(ReportEmployee employee, int year, LocalDate generatedOn, int pool, boolean poolIsDefault,
                         int taken, int planned, int remaining, int[] months, List<ReportLeave> leaves) {

    public record ReportEmployee(String id, String firstName, String lastName) {
    }

    public record ReportLeave(LocalDate startDate, LocalDate endDate, int daysInYear, Status status) {
    }

    /** {@code TAKEN} ended before today, {@code PLANNED} starts today or later, {@code IN_PROGRESS} spans today. */
    public enum Status {
        TAKEN, IN_PROGRESS, PLANNED
    }
}
