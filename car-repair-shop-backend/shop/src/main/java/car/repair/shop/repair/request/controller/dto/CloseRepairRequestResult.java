package car.repair.shop.repair.request.controller.dto;

import car.repair.shop.repair.request.RepairRequestStatus;

/**
 * @param reviewEmailSent whether the review e-mail actually went out. Closing succeeds even
 *                        when this is false, so the portal can warn the receptionist - the
 *                        close is terminal and cannot be retried.
 */
public record CloseRepairRequestResult(RepairRequestStatus status, boolean reviewEmailSent) {
}
