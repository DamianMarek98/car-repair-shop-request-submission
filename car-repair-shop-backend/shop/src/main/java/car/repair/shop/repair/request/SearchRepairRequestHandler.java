package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.RepairRequestListItem;
import car.repair.shop.repair.request.query.SearchRepairRequestQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;

import static car.repair.shop.repair.request.RepairRequest.DUMMY_PARTITION_KEY;

@Service
@RequiredArgsConstructor
public class SearchRepairRequestHandler {
    private final RepairRequestSearchRepository repairRequestSearchRepository;

    public Page<RepairRequestListItem> search(SearchRepairRequestQuery searchRepairRequestQuery) {
        Page<RepairRequest> page = repairRequestSearchRepository.findByDummyPartitionKey(DUMMY_PARTITION_KEY, searchRepairRequestQuery.toPageRequest());
        return new PageImpl<>(page.stream()
                .map(RepairRequestListItem::from)
                .toList(), page.getPageable(), page.getTotalElements());
    }
}
