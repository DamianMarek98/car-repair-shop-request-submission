package car.repair.shop.repair.request;

import org.socialsignin.spring.data.dynamodb.repository.EnableScan;
import org.springframework.data.repository.CrudRepository;

@EnableScan
interface RepairRequestRepository extends CrudRepository<RepairRequest, String> {
}
