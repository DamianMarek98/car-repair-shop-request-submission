package car.repair;

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

public class RepairRequestSubmissionConsumer implements RequestHandler<SQSEvent, Void> {

    private final DynamoDbClient dynamoDb = DynamoDbClient.create();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public Void handleRequest(SQSEvent event, Context context) {
        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                // Parse JSON body
                JsonNode body = mapper.readTree(msg.getBody());

                // Example transformation: extract "id" and "name"
                String id = body.get("id").asText();
                String name = body.get("name").asText();

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
