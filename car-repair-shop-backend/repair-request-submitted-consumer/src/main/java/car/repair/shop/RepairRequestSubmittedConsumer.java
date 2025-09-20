package car.repair.shop;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.HashMap;
import java.util.Map;

/**
 * In the end the decision is to skip SQS
 * and use api gateway + lambda to validate and store new repair request directly.
 * Api gateway will verify schema and lambda will do business validation and store in DynamoDB.
 */
// todo refactor to lambda handler
// todo remember to move tests
// todo remember to clean up main shop module
public class RepairRequestSubmittedConsumer implements RequestHandler<SQSEvent, Void> {

    private final DynamoDbClient dynamoDb = DynamoDbClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Void handleRequest(SQSEvent event, Context context) {
        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                // Parse JSON body
                JsonNode body = objectMapper.readTree(msg.getBody());
                var submitRepairRequest = objectMapper.treeToValue(body, SubmitRepairRequestDto.class);

                // todo mapping
                // Put into DynamoDB
                Map<String, AttributeValue> item = new HashMap<>();
                item.put("id", AttributeValue.builder().s(id).build());
                item.put("name", AttributeValue.builder().s(name).build());

                PutItemRequest request = PutItemRequest.builder()
                        .tableName("YourDynamoTable")
                        .item(item)
                        .build();

                dynamoDb.putItem(request);

                context.getLogger().log("Saved item with id=" + id);
            } catch (Exception e) {
                context.getLogger().log("Error: " + e.getMessage());
            }
        }
        return null;
    }
}
