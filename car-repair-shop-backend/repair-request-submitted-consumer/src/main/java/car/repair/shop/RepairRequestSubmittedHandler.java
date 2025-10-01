package car.repair.shop;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.validation.*;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.util.Map;
import java.util.Set;

/**
 * In the end the decision is to skip SQS
 * and use api gateway + lambda to validate and store new repair request directly.
 * Api gateway will verify schema and lambda will do business validation and store in DynamoDB.
 */
public class RepairRequestSubmittedHandler implements RequestHandler<Map<String, Object>, APIGatewayProxyResponseEvent> {

    private static final int OK_STATUS = 200;
    private static final int BAD_REQUEST_STATUS = 400;
    private static final int INTERNAL_SERVER_ERROR_STATUS = 500;
    private final DynamoDbClient dynamoDb;
    private final ObjectMapper objectMapper;

    public RepairRequestSubmittedHandler() {
        dynamoDb = DynamoDbClient.create();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    public RepairRequestSubmittedHandler(DynamoDbClient dbClient) {
        dynamoDb = dbClient;
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(Map<String, Object> input, Context context) {
        context.getLogger().log("Received event: " + input);

        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            var bodyJson = objectMapper.writeValueAsString(input);
            var submitRepairRequest = objectMapper.readValue(bodyJson, SubmitRepairRequestDto.class);
            validateInput(context, factory, submitRepairRequest);


            PutItemRequest request = PutItemRequest.builder()
                    .tableName("repair_request")
                    .item(RepairRequestItemConverter.toItem(submitRepairRequest, objectMapper))
                    .build();
            context.getLogger().log("Storing repair request: " + request);

            dynamoDb.putItem(request);
            context.getLogger().log("Repair request stored successfully");
        } catch (JsonProcessingException e) {
            context.getLogger().log("Error: " + e.getMessage());
            return createResponse(INTERNAL_SERVER_ERROR_STATUS, "Error processing request: " + e.getMessage());
        } catch (ConstraintViolationException e) {
            context.getLogger().log("Error: " + e.getMessage());
            return createResponse(BAD_REQUEST_STATUS, "Validation error: " + e.getMessage());
        }

        return createResponse(OK_STATUS, "Repair request submitted successfully");
    }

    private static void validateInput(Context context, ValidatorFactory factory, SubmitRepairRequestDto submitRepairRequest) {
        Validator validator = factory.getValidator();
        Set<ConstraintViolation<SubmitRepairRequestDto>> violations = validator.validate(submitRepairRequest);

        if (!violations.isEmpty()) {
            context.getLogger().log("Validation errors: ");
            violations.forEach(v -> context.getLogger().log(v.getPropertyPath() + ": " + v.getMessage()));
            throw new ConstraintViolationException(violations);
        }

        if (!submitRepairRequest.rodo()) {
            throw new ConstraintViolationException("Rodo must be accepted", null);
        } else if (submitRepairRequest.vin() == null && submitRepairRequest.plateNumber() == null) {
            throw new ConstraintViolationException("Vin or plateNumber must be provided", null);
        }
    }

    private APIGatewayProxyResponseEvent createResponse(int statusCode, String message) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(Map.of("Content-Type", "application/json"))
                .withBody("{\"message\": \"" + message + "\"}");
    }
}
