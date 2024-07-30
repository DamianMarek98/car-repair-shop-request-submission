package car.repair.shop.repair.request.controller;

import car.repair.shop.repair.request.SubmitNewRepairRequestHandler;
import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/repair-request")
@RequiredArgsConstructor
public class RepairRequestSubmitController {
    private final SubmitNewRepairRequestHandler submitNewRepairRequestHandler;

    @PostMapping("/submit")
    @ResponseStatus(code = HttpStatus.CREATED)
    @CrossOrigin(origins = "http://localhost:4200")
    public void submitRepairRequest(@Valid @RequestBody SubmitRepairRequestDto submitRepairRequestDto) {
        submitNewRepairRequestHandler.handle(submitRepairRequestDto);
    }
}
