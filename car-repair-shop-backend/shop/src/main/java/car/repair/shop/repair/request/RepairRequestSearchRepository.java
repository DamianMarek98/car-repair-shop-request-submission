package car.repair.shop.repair.request;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.PagingAndSortingRepository;

interface RepairRequestSearchRepository extends PagingAndSortingRepository<RepairRequest, String> {
    Page<RepairRequest> findByDummyPartitionKey(String dummyPartitionKey, Pageable pageable);
}