package car.repair.shop.repair.request;

import car.repair.shop.commons.exceptions.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MarkAsHandledCommandHandler {
    private final RepairRequestRepository repairRequestRepository;

    public void handle(String id) {
        repairRequestRepository.findById(id)
                .map(RepairRequestStateFactory::from)
                .ifPresentOrElse(repairRequestState -> {
                    repairRequestState.markAsHandled();
                    repairRequestRepository.save(repairRequestState.repairRequest);
                }, EntityNotFoundException::new);
    }
}
