package car.repair.shop.repair.request;

import car.repair.shop.commons.exceptions.EntityNotFoundException;
import car.repair.shop.notification.NotificationFacade;
import car.repair.shop.repair.request.controller.dto.CloseRepairRequestCommand;
import car.repair.shop.repair.request.controller.dto.CloseRepairRequestResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class MarkAsAppointmentMadeCommandHandler {
    private final RepairRequestRepository repairRequestRepository;
    private final NotificationFacade notificationFacade;

    public CloseRepairRequestResult handle(String id, CloseRepairRequestCommand command) {
        var repairRequestState = repairRequestRepository.findById(id)
                .map(RepairRequestStateFactory::from)
                .orElseThrow(EntityNotFoundException::new);

        repairRequestState.markAsAppointmentMade();
        var repairRequest = repairRequestRepository.save(repairRequestState.repairRequest);

        // The close is persisted before the e-mail is attempted
        var reviewEmailSent = sendReviewEmailIfAllowed(repairRequest, command);
        if (reviewEmailSent) {
            repairRequest.markReviewEmailSent();
            repairRequest = repairRequestRepository.save(repairRequest);
        }

        return new CloseRepairRequestResult(repairRequest.getStatus(), reviewEmailSent);
    }

    private boolean sendReviewEmailIfAllowed(RepairRequest repairRequest, CloseRepairRequestCommand command) {
        var allowed = command != null
                && command.sendReviewEmail()
                && repairRequest.isReviewEmailConsent()
                && repairRequest.getReviewEmailSentAt() == null
                && StringUtils.hasText(repairRequest.getEmail());

        return allowed && notificationFacade.sendReviewRequestEmail(repairRequest.getEmail(),
                repairRequest.getSubmitterFirstName());
    }
}
