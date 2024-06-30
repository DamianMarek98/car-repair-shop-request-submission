package car.repair.shop.repair.request;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper;
import com.amazonaws.services.dynamodbv2.model.CreateTableRequest;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.util.TableUtils;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.utility.DockerImageName;

@Slf4j
@SpringBootTest
@ActiveProfiles("test")
abstract class RepairRequestIntegrationTest {
    private static final LocalStackContainer localStackContainer;

    static {
        localStackContainer = new LocalStackContainer(DockerImageName.parse("localstack/localstack:3.2"))
                .withServices(LocalStackContainer.Service.DYNAMODB)
                .withExposedPorts(4566);
        localStackContainer.start();
    }

    @Autowired
    private AmazonDynamoDB amazonDynamoDB;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("car.repair.shop.aws.access-key", localStackContainer::getAccessKey);
        registry.add("car.repair.shop.aws.secret-access-key", localStackContainer::getSecretKey);
        registry.add("car.repair.shop.aws.region", localStackContainer::getRegion);
        registry.add("car.repair.shop.aws.endpoint", localStackContainer::getEndpoint);
    }

    @PostConstruct
    void init() {
        DynamoDBMapper dynamoDBMapper = new DynamoDBMapper(amazonDynamoDB);

        CreateTableRequest tableRepairRequest = dynamoDBMapper
                .generateCreateTableRequest(RepairRequest.class);
        tableRepairRequest.setProvisionedThroughput(
                new ProvisionedThroughput(1L, 1L));
        TableUtils.createTableIfNotExists(amazonDynamoDB, tableRepairRequest);
        log.info("RepairRequestIntegrationTest init done");
    }
}
