package car.repair.shop.team.controller.dto;

public record EmployeeView(String id, String firstName, String lastName, int colorIndex, int defaultAnnualDays,
                           Balance balance) {
}
