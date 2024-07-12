package car.repair.shop.repair.request.controller;

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
    //todo get repair request
    //todo mark as handled and mark as appointment made
    private final SearchRepairRequestHandler searchRepairRequestHandler;
    private final RepairRequestGetQueryHandler repairRequestGetQueryHandler;

    @GetMapping("/search")
    @CrossOrigin(origins = "http://localhost:4201")
    @ResponseStatus(code = HttpStatus.OK)
    public Page<RepairRequestListItem> submitRepairRequest(@RequestParam int page,
                                                           @RequestParam int size,
                                                           @RequestParam(required = false) String sortField,
                                                           @RequestParam(required = false) Sort.Direction sortDirection) {
        return searchRepairRequestHandler.search(new SearchRepairRequestQuery(page, size, sortField, sortDirection));
    }

    @GetMapping("/{id}")
    @CrossOrigin(origins = "http://localhost:4201")
    @ResponseStatus(code = HttpStatus.OK)
    public RepairRequestDto getRepairRequest(@PathVariable String id) {
        return repairRequestGetQueryHandler.getById(id);
    }
}
