package car.repair.shop.repair.request.controller.dto;

/**
 * Body of the close ("Wizyta odbyta") action.
 * <p>
 * The whole command is optional - an admin portal that predates this feature posts no body at
 * all, which must keep working and simply means "do not send the e-mail".
 *
 * @param sendReviewEmail the receptionist's intent only. It is never trusted on its own:
 *                        the customer's stored consent is what actually authorises the send.
 */
public record CloseRepairRequestCommand(boolean sendReviewEmail) {
}
