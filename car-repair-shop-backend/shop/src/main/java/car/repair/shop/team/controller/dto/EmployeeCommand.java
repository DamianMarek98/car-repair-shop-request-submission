package car.repair.shop.team.controller.dto;

/** Create/update body. {@code defaultAnnualDays}: null means 26 on create and "unchanged" on update. */
public record EmployeeCommand(String firstName, String lastName, Integer defaultAnnualDays) {
}
