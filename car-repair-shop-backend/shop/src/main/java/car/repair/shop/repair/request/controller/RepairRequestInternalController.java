package car.repair.shop.repair.request.controller;

import car.repair.shop.repair.request.MarkAsAppointmentMadeCommandHandler;
import car.repair.shop.repair.request.MarkAsHandledCommandHandler;
import car.repair.shop.repair.request.RepairRequestGetQueryHandler;
import car.repair.shop.repair.request.SearchRepairRequestHandler;
import car.repair.shop.repair.request.controller.dto.RepairRequestDto;
import car.repair.shop.repair.request.controller.dto.RepairRequestListItem;
import car.repair.shop.repair.request.query.SearchRepairRequestQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal/repair-request")
@RequiredArgsConstructor
public class RepairRequestInternalController {

    private final SearchRepairRequestHandler searchRepairRequestHandler;
    private final RepairRequestGetQueryHandler repairRequestGetQueryHandler;
    private final MarkAsHandledCommandHandler markAsHandledCommandHandler;
    private final MarkAsAppointmentMadeCommandHandler markAsAppointmentMadeCommandHandler;

    @GetMapping("/search")
    @ResponseStatus(code = HttpStatus.OK)
    public Page<RepairRequestListItem> submitRepairRequest(@RequestParam int page,
                                                           @RequestParam int size,
                                                           @RequestParam(required = false) String sortField,
                                                           @RequestParam(required = false) Sort.Direction sortDirection) {
        return searchRepairRequestHandler.search(new SearchRepairRequestQuery(page, size, sortField, sortDirection));
    }

    @GetMapping("/{id}")
    @ResponseStatus(code = HttpStatus.OK)
    public RepairRequestDto getRepairRequest(@PathVariable String id) {
        return repairRequestGetQueryHandler.getById(id);
    }

    @PostMapping("/{id}/mark-as-handled")
    @ResponseStatus(code = HttpStatus.OK)
    public void markRepairRequestAsHandled(@PathVariable String id) {
        markAsHandledCommandHandler.handle(id);
    }

    @PostMapping("/{id}/mark-as-appointment-made")
    @ResponseStatus(code = HttpStatus.OK)
    public void markRepairRequestAsAppointmentMade(@PathVariable String id) {
        markAsAppointmentMadeCommandHandler.handle(id);
    }
}
