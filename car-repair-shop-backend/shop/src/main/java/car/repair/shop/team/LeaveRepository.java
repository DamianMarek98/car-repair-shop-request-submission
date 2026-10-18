package car.repair.shop.team;

import org.socialsignin.spring.data.dynamodb.repository.EnableScan;
import org.springframework.data.repository.CrudRepository;

// ~150 rows a year: every read is a full scan, filtered in memory (no GSI on employee_id).
@EnableScan
interface LeaveRepository extends CrudRepository<Leave, String> {
}
