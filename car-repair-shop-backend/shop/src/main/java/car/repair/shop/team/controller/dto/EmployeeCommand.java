package car.repair.shop.team.controller.dto;

import java.time.LocalDate;

/**
 * Create/update body. {@code defaultAnnualDays}: null means 26 on create and "unchanged" on update.
 * <p>
 * The two valid-until dates are a full replacement: null (or missing) means "no date", so an update
 * without them clears them. The portal always sends both.
 */
public record EmployeeCommand(String firstName, String lastName, Integer defaultAnnualDays,
                              LocalDate medicalExamValidUntil, LocalDate bhpTrainingValidUntil) {

    /** Without dates - for callers that don't deal with them. */
    public EmployeeCommand(String firstName, String lastName, Integer defaultAnnualDays) {
        this(firstName, lastName, defaultAnnualDays, null, null);
    }
}
