package car.repair.shop.team.controller.dto;

import java.time.LocalDate;

/** Create/update body; both dates inclusive. On update {@code employeeId} may be omitted, but not changed. */
public record LeaveCommand(String employeeId, LocalDate startDate, LocalDate endDate) {
}
