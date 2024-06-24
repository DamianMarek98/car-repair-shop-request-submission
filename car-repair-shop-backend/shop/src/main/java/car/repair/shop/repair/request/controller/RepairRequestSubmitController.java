package car.repair.shop.repair.request.controller;

import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/repair-request")
public class RepairRequestSubmitController {

    @PostMapping("/submit")
    public void submitRepairRequest(@RequestBody SubmitRepairRequestDto submitRepairRequestDto) {

    }
}
