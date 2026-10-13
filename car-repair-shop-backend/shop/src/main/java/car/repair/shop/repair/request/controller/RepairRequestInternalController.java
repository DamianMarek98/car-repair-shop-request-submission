package car.repair.shop.repair.request.controller;

import car.repair.shop.repair.request.MarkAsAppointmentMadeCommandHandler;
import car.repair.shop.repair.request.RepairRequestGetQueryHandler;
import car.repair.shop.repair.request.SearchRepairRequestHandler;
import car.repair.shop.repair.request.SetAppointmentCommandHandler;
import car.repair.shop.repair.request.controller.dto.CloseRepairRequestCommand;
import car.repair.shop.repair.request.controller.dto.CloseRepairRequestResult;
import car.repair.shop.repair.request.controller.dto.RepairRequestDto;
import car.repair.shop.repair.request.controller.dto.RepairRequestListItem;
import car.repair.shop.repair.request.controller.dto.SetAppointmentCommand;
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
    private final SetAppointmentCommandHandler setAppointmentCommandHandler;
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

    /**
     * Books the visit (NEW -> HANDLED) or changes the time of a booked one. Replaces the former
     * {@code mark-as-handled}: the workshop must always provide the visit time.
     */
    @PostMapping("/{id}/appointment")
    @ResponseStatus(code = HttpStatus.OK)
    public void setAppointment(@PathVariable String id,
                               @RequestBody(required = false) SetAppointmentCommand command) {
        setAppointmentCommandHandler.handle(id, command);
    }

    @PostMapping("/{id}/mark-as-appointment-made")
    @ResponseStatus(code = HttpStatus.OK)
    public CloseRepairRequestResult markRepairRequestAsAppointmentMade(@PathVariable String id,
                                                                      @RequestBody(required = false) CloseRepairRequestCommand command) {
        return markAsAppointmentMadeCommandHandler.handle(id, command);
    }
}
