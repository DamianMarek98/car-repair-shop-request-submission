package car.repair.shop.team;

import org.socialsignin.spring.data.dynamodb.repository.EnableScan;
import org.springframework.data.repository.CrudRepository;

// 10-15 rows that won't grow: every read is a full scan, filtered in memory.
@EnableScan
interface EmployeeRepository extends CrudRepository<Employee, String> {
}
