package car.repair.shop.team.controller.dto;

import java.time.LocalDate;

/** The two valid-until dates are null when not entered; their expiry colour is computed in the portal. */
public record EmployeeView(String id, String firstName, String lastName, int colorIndex, int defaultAnnualDays,
                           LocalDate medicalExamValidUntil, LocalDate bhpTrainingValidUntil, Balance balance) {
}
