package car.repair.shop.team.controller.dto;

import java.util.List;

/** Result of a create/update: the leave, the balance of every year it touched, and any warnings. */
public record LeaveSaveResult(LeaveView leave, List<Balance> balance, List<LeaveWarning> warnings) {
}
