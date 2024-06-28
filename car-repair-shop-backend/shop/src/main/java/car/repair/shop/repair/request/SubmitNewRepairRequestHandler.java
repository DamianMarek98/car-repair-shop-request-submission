package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import car.repair.shop.repair.request.events.NewRepairRequestEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmitNewRepairRequestHandler {
    private final ApplicationEventPublisher eventPublisher;
    private final RepairRequestRepository repairRequestRepository;

    //todo write integration test with testcontainers for happy path, maybe add validation for email, phone number but don't waste time on testing each validation for now
    public void handle(SubmitRepairRequestDto submitRepairRequestDto) {
        var repairRequest = RepairRequest.from(submitRepairRequestDto);
        repairRequest = repairRequestRepository.save(repairRequest);
        log.info("New request with id: {} submitted!", repairRequest.getId());
        eventPublisher.publishEvent(new NewRepairRequestEvent());
    }

}
