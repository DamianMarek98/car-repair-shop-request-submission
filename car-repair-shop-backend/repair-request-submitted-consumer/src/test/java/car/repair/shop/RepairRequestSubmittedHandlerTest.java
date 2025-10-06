package car.repair.shop;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RepairRequestSubmittedHandlerTest {

    @Mock
    private DynamoDbClient mockDynamoDbClient;

    @Mock
    private Context mockContext;

    @Mock
    private LambdaLogger mockLogger;

    private RepairRequestSubmittedHandler handler;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        handler = new RepairRequestSubmittedHandler(mockDynamoDbClient);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        when(mockContext.getLogger()).thenReturn(mockLogger);
    }

    @Test
    void givenValidRequest_shouldReturn200AndStoreRepairRequestInDynamoDB() throws JsonProcessingException {
        // Given
        var request = new SubmitRepairRequestDtoBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withTimeSlots(List.of())
                .withPhoneNumber("111222333")
                .asap()
                .withRodoApproval()
                .build();

        Map<String, Object> input = Map.of("body", objectMapper.writeValueAsString(request));

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(200, response.getStatusCode());
        assertTrue(response.getBody().contains("Repair request submitted successfully"));

        ArgumentCaptor<PutItemRequest> putItemCaptor = ArgumentCaptor.forClass(PutItemRequest.class);
        verify(mockDynamoDbClient).putItem(putItemCaptor.capture());

        PutItemRequest capturedRequest = putItemCaptor.getValue();
        assertThat(capturedRequest.tableName()).isEqualTo("repair_request");

        Map<String, AttributeValue> item = capturedRequest.item();
        assertNotNull(item.get("id"));
        assertThat(item.get("id").s()).isNotEmpty();
        assertThat(item.get("dummyPartitionKey").s()).isEqualTo("DUMMY");
        assertThat(item.get("vin").s()).isEqualTo(request.vin());
        assertNull(item.get("plate_number").s());
        assertThat(item.get("issue_description").s()).isEqualTo(request.issueDescription());
        assertThat(item.get("submitter_first_name").s()).isEqualTo(request.firstName());
        assertThat(item.get("submitter_last_name").s()).isEqualTo(request.lastName());
        assertThat(item.get("phone_number").s()).isEqualTo(request.phoneNumber());
        assertThat(item.get("email").s()).isEqualTo(request.email());
        assertThat(item.get("asap").n()).isEqualTo("1");
        assertThat(item.get("rodo").n()).isEqualTo("1");
        assertThat(item.get("status_value").s()).isEqualTo("NEW");
        assertNotNull(item.get("submittedAt"));
        assertThat(item.get("submittedAt").s()).isNotEmpty();
        assertNotNull(item.get("preferred_visit_windows"));
        assertThat(item.get("preferred_visit_windows").s()).isEqualTo("[]");

        verify(mockLogger, times(3)).log(anyString());
    }

    @Test
    void givenValidRequestWithPlateNumber_shouldReturn200AndStoreRepairRequestInDynamoDB() throws JsonProcessingException {
        // Given
        SubmitRepairRequestDto.TimeSlotDto timeSlot = new SubmitRepairRequestDto.TimeSlotDto(LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(17, 0));
        var request = new SubmitRepairRequestDtoBuilder()
                .withPlateNumber("GD12345")
                .withIssueDescription("brake issues")
                .withEmail("john@test.com")
                .withFirstName("John")
                .withLastName("Doe")
                .withTimeSlots(List.of(timeSlot))
                .withPhoneNumber("555123456")
                .withRodoApproval()
                .build();

        Map<String, Object> input = Map.of("body", objectMapper.writeValueAsString(request));

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(200, response.getStatusCode());
        assertTrue(response.getBody().contains("Repair request submitted successfully"));

        ArgumentCaptor<PutItemRequest> putItemCaptor = ArgumentCaptor.forClass(PutItemRequest.class);
        verify(mockDynamoDbClient).putItem(putItemCaptor.capture());

        PutItemRequest capturedRequest = putItemCaptor.getValue();
        Map<String, AttributeValue> item = capturedRequest.item();

        assertThat(item.get("plate_number").s()).isEqualTo(request.plateNumber());
        assertNull(item.get("vin").s());
        assertThat(item.get("asap").n()).isEqualTo("0");
        assertThat(item.get("rodo").n()).isEqualTo("1");
    }

    @Test
    void givenRequestWithMultipleTimeSlots_shouldReturn200AndStoreAllTimeSlots() throws JsonProcessingException {
        // Given
        SubmitRepairRequestDto.TimeSlotDto timeSlot1 = new SubmitRepairRequestDto.TimeSlotDto(LocalDate.of(2025, 10, 15), LocalTime.of(9, 0), LocalTime.of(12, 0));
        SubmitRepairRequestDto.TimeSlotDto timeSlot2 = new SubmitRepairRequestDto.TimeSlotDto(LocalDate.of(2025, 11, 16), LocalTime.of(14, 0), null);
        SubmitRepairRequestDto.TimeSlotDto timeSlot3 = new SubmitRepairRequestDto.TimeSlotDto(LocalDate.of(2025, 12, 17), null, null);

        var request = new SubmitRepairRequestDtoBuilder()
                .withVin("1HGBH41JXMN109186")
                .withIssueDescription("multiple time slots test")
                .withEmail("multi@test.com")
                .withFirstName("Multi")
                .withLastName("Test")
                .withTimeSlots(List.of(timeSlot1, timeSlot2, timeSlot3))
                .withPhoneNumber("123456789")
                .withRodoApproval()
                .build();

        Map<String, Object> input = Map.of("body", objectMapper.writeValueAsString(request));

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(200, response.getStatusCode());
        assertTrue(response.getBody().contains("Repair request submitted successfully"));

        ArgumentCaptor<PutItemRequest> putItemCaptor = ArgumentCaptor.forClass(PutItemRequest.class);
        verify(mockDynamoDbClient).putItem(putItemCaptor.capture());

        PutItemRequest capturedRequest = putItemCaptor.getValue();
        Map<String, AttributeValue> item = capturedRequest.item();

        String timeSlots = item.get("preferred_visit_windows").s();
        assertThat(timeSlots).isEqualTo("[{\"date\":[2025,10,15],\"from\":[9,0],\"to\":[12,0]},{\"date\":[2025,11,16],\"from\":[14,0],\"to\":null},{\"date\":[2025,12,17],\"from\":null,\"to\":null}]");
    }

    @Test
    void givenRequestWithEmptyTimeSlots_shouldReturn200AndStoreEmptyTimeSlots() throws JsonProcessingException {
        // Given
        var request = new SubmitRepairRequestDtoBuilder()
                .withVin("2T1BURHE0JC123456")
                .withIssueDescription("no time preference")
                .withEmail("flexible@test.com")
                .withFirstName("Flexible")
                .withLastName("Customer")
                .withEmptyTimeSlots()
                .withPhoneNumber("987654321")
                .asap()
                .withRodoApproval()
                .build();

        Map<String, Object> input = Map.of("body", objectMapper.writeValueAsString(request));

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(200, response.getStatusCode());
        assertTrue(response.getBody().contains("Repair request submitted successfully"));

        ArgumentCaptor<PutItemRequest> putItemCaptor = ArgumentCaptor.forClass(PutItemRequest.class);
        verify(mockDynamoDbClient).putItem(putItemCaptor.capture());

        PutItemRequest capturedRequest = putItemCaptor.getValue();
        Map<String, AttributeValue> item = capturedRequest.item();

        assertThat(item.get("preferred_visit_windows").s()).isEqualTo("[]");
        assertThat(item.get("asap").n()).isEqualTo("1");
    }

    @Test
    void givenInvalidJsonInBody_shouldReturn500AndLogError() {
        // Given
        String invalidJson = "{ invalid json }";
        Map<String, Object> input = Map.of("body", invalidJson);

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(500, response.getStatusCode());
        assertTrue(response.getBody().contains("Error processing request"));
        verify(mockDynamoDbClient, never()).putItem(any(PutItemRequest.class));
        verify(mockLogger).log(contains("Error:"));
    }

    @Test
    void givenRequestWithoutVinOrPlateNumber_shouldReturn400() throws JsonProcessingException {
        // Given
        var request = new SubmitRepairRequestDtoBuilder()
                .withIssueDescription("test issue")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withTimeSlots(List.of())
                .withPhoneNumber("111222333")
                .asap()
                .withRodoApproval()
                .build();

        Map<String, Object> input = Map.of("body", objectMapper.writeValueAsString(request));

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(400, response.getStatusCode());
        assertEquals("{\"message\": \"Validation error: Vin or plateNumber must be provided\"}", response.getBody());
        verify(mockDynamoDbClient, never()).putItem(any(PutItemRequest.class));
    }

    @Test
    void givenRequestWithInvalidEmail_shouldReturn400() throws JsonProcessingException {
        // Given
        var request = new SubmitRepairRequestDtoBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test issue")
                .withEmail("invalid-email")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withTimeSlots(List.of())
                .withPhoneNumber("111222333")
                .asap()
                .withRodoApproval()
                .build();

        Map<String, Object> input = Map.of("body", objectMapper.writeValueAsString(request));

        // When
        APIGatewayProxyResponseEvent response = handler.handleRequest(input, mockContext);

        // Then
        assertEquals(400, response.getStatusCode());
        assertEquals("{\"message\": \"Validation error: email: Email should be valid\"}", response.getBody());
        verify(mockDynamoDbClient, never()).putItem(any(PutItemRequest.class));
    }

    static class SubmitRepairRequestDtoBuilder {
        private String vin;
        private String plateNumber;
        private String issueDescription;
        private String firstName;
        private String lastName;
        private String email;
        private String phoneNumber;
        private List<SubmitRepairRequestDto.TimeSlotDto> timeSlots;
        private boolean asap;
        private boolean rodo;

        SubmitRepairRequestDtoBuilder withVin(String vin) {
            this.vin = vin;
            return this;
        }

        SubmitRepairRequestDtoBuilder withPlateNumber(String plateNumber) {
            this.plateNumber = plateNumber;
            return this;
        }

        SubmitRepairRequestDtoBuilder withIssueDescription(String issueDescription) {
            this.issueDescription = issueDescription;
            return this;
        }

        SubmitRepairRequestDtoBuilder withFirstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        SubmitRepairRequestDtoBuilder withLastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        SubmitRepairRequestDtoBuilder withEmail(String email) {
            this.email = email;
            return this;
        }

        SubmitRepairRequestDtoBuilder withPhoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        SubmitRepairRequestDtoBuilder withTimeSlots(List<SubmitRepairRequestDto.TimeSlotDto> timeSlots) {
            this.timeSlots = timeSlots;
            return this;
        }

        SubmitRepairRequestDtoBuilder withEmptyTimeSlots() {
            this.timeSlots = List.of();
            return this;
        }

        SubmitRepairRequestDtoBuilder asap() {
            this.asap = true;
            return this;
        }

        SubmitRepairRequestDtoBuilder withRodoApproval() {
            this.rodo = true;
            return this;
        }

        SubmitRepairRequestDto build() {
            return new SubmitRepairRequestDto(vin, plateNumber, issueDescription, firstName, lastName, email, phoneNumber, timeSlots, asap, rodo);
        }
    }
}
