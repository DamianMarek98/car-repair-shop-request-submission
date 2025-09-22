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
public class RepairRequestSubmittedHandler implements RequestHandler<Map<String, Object>, Void> {

    private final DynamoDbClient dynamoDb = DynamoDbClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Void handleRequest(Map<String, Object> input, Context context) {
        String body = (String) input.get("body");

        try {
            // Parse JSON body
            var submitRepairRequest = objectMapper.readValue(body, SubmitRepairRequestDto.class);

            // todo mapping
            // Put into DynamoDB
            Map<String, AttributeValue> item = new HashMap<>();
//            item.put("id", AttributeValue.builder().s(id).build());
//            item.put("name", AttributeValue.builder().s(name).build());

            PutItemRequest request = PutItemRequest.builder()
                    .tableName("YourDynamoTable")
                    .item(item)
                    .build();

            dynamoDb.putItem(request);


        } catch (Exception e) {
            context.getLogger().log("Error: " + e.getMessage());
        }

        return null;
    }
}
