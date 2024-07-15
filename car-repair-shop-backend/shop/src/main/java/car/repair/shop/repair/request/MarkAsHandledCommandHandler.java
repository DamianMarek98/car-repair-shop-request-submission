package car.repair.shop.repair.request;

import car.repair.shop.commons.exceptions.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MarkAsHandledCommandHandler {
    private final RepairRequestRepository repairRequestRepository;

    public void handle(String id) {
        var repairRequestState = repairRequestRepository.findById(id)
                .map(RepairRequestStateFactory::from)
                .orElseThrow(EntityNotFoundException::new);
        repairRequestState.markAsHandled();
        repairRequestRepository.save(repairRequestState.repairRequest);
    }
}
