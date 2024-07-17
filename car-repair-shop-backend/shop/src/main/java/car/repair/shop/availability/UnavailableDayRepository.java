package car.repair.shop.availability;

import org.socialsignin.spring.data.dynamodb.repository.EnableScan;
import org.springframework.data.repository.CrudRepository;

@EnableScan
interface UnavailableDayRepository extends CrudRepository<UnavailableDay, String> {
}
