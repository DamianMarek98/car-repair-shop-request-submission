package car.repair.shop.repair.request.controller;

import car.repair.shop.repair.request.SubmitNewRepairRequestHandler;
import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/repair-request")
@RequiredArgsConstructor
public class RepairRequestSubmitController {
    private final SubmitNewRepairRequestHandler submitNewRepairRequestHandler;

    @PostMapping("/submit")
    @ResponseStatus(code = HttpStatus.CREATED)
    public void submitRepairRequest(@RequestBody @Valid SubmitRepairRequestDto submitRepairRequestDto) {
        submitNewRepairRequestHandler.handle(submitRepairRequestDto);
    }
}
