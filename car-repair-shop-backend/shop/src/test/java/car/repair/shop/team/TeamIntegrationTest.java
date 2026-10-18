package car.repair.shop.team;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.util.TableUtils;
import jakarta.annotation.PostConstruct;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

/**
 * Base for team-module integration tests: LocalStack DynamoDB with both team tables, emptied before
 * every test, and the clock pinned to {@link #TODAY} so taken/planned splits are deterministic.
 * Mirrors {@code RepairRequestIntegrationTest}, which is package-private to its own module.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TeamIntegrationTest.FixedClockConfig.class)
abstract class TeamIntegrationTest {
    /** Monday - the "today" of the local test scenario (plan §6.0). */
    static final LocalDate TODAY = LocalDate.of(2026, 11, 2);
    private static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Warsaw");

    private static final LocalStackContainer localStackContainer;

    static {
        localStackContainer = new LocalStackContainer(DockerImageName.parse("localstack/localstack:3.2"))
                .withServices(LocalStackContainer.Service.DYNAMODB)
                .withExposedPorts(4566);
        localStackContainer.start();
    }

    @Autowired
    private AmazonDynamoDB amazonDynamoDB;

    @Autowired
    EmployeeRepository employeeRepository;

    @Autowired
    LeaveRepository leaveRepository;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("car.repair.shop.aws.access-key", localStackContainer::getAccessKey);
        registry.add("car.repair.shop.aws.secret-access-key", localStackContainer::getSecretKey);
        registry.add("car.repair.shop.aws.region", localStackContainer::getRegion);
        registry.add("car.repair.shop.aws.endpoint", localStackContainer::getEndpoint);
    }

    @PostConstruct
    void createTables() {
        var mapper = new DynamoDBMapper(amazonDynamoDB);
        for (var entity : new Class<?>[]{Employee.class, Leave.class}) {
            var request = mapper.generateCreateTableRequest(entity);
            request.setProvisionedThroughput(new ProvisionedThroughput(1L, 1L));
            TableUtils.createTableIfNotExists(amazonDynamoDB, request);
        }
    }

    @BeforeEach
    void emptyTables() {
        leaveRepository.deleteAll();
        employeeRepository.deleteAll();
    }

    /** Writes an employee straight to the table; {@code typedPools} as year → days. */
    Employee givenEmployee(String firstName, String lastName, int defaultDays, Map<String, Integer> typedPools) {
        var employee = new Employee();
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        employee.setDefaultAnnualDays(defaultDays);
        employee.setAnnualDaysByYear(new HashMap<>(typedPools));
        employee.setColorIndex(0);
        return employeeRepository.save(employee);
    }

    Leave givenLeave(Employee employee, String start, String end) {
        var leave = new Leave();
        leave.setEmployeeId(employee.getId());
        leave.setStartDate(LocalDate.parse(start));
        leave.setEndDate(LocalDate.parse(end));
        return leaveRepository.save(leave);
    }

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(TODAY.atTime(10, 0).atZone(SHOP_ZONE).toInstant(), SHOP_ZONE);
        }
    }
}
