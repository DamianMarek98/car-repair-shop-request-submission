import car.repair.shop.confirmation.NewRepairRequestSubmittedEmailNotifier;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.StreamRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NewRepairRequestSubmittedEmailNotifierTest {

    private static final String FROM = "no-reply@renocar-zgloszenie.pl";
    private static final String REPLY_TO = "kontakt@renocar-zgloszenie.pl";
    private static final String PHONE = "+48 000 000 000";

    private NewRepairRequestSubmittedEmailNotifier notifier;
    private SesV2Client sesClient;

    @Mock
    private Context mockContext;

    @Mock
    private LambdaLogger mockLogger;

    @BeforeEach
    void setUp() {
        sesClient = mock(SesV2Client.class);
        notifier = new NewRepairRequestSubmittedEmailNotifier(sesClient, FROM, REPLY_TO, PHONE);
        when(mockContext.getLogger()).thenReturn(mockLogger);
    }

    @Test
    void givenInsertWithEmailShouldSendConfirmation() {
        // Given
        DynamodbEvent event = insertEvent(Map.of(
                "email", new AttributeValue("jan.kowalski@example.com"),
                "submitter_first_name", new AttributeValue("Jan"),
                "id", new AttributeValue("abc-123")
        ));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        ArgumentCaptor<SendEmailRequest> captor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(sesClient).sendEmail(captor.capture());

        SendEmailRequest sent = captor.getValue();
        assert sent.fromEmailAddress().equals(FROM);
        assert sent.replyToAddresses().contains(REPLY_TO);
        assert sent.destination().toAddresses().contains("jan.kowalski@example.com");
        assert !sent.content().simple().subject().data().isBlank();
        assert sent.content().simple().subject().charset().equals("UTF-8");
        assert sent.content().simple().body().text().data().contains("abc-123");
        assert sent.content().simple().body().text().data().contains("Jan");
        assert sent.content().simple().body().text().charset().equals("UTF-8");
    }

    @Test
    void givenInsertWithMissingEmailShouldNotSend() {
        // Given
        DynamodbEvent event = insertEvent(Map.of(
                "submitter_first_name", new AttributeValue("Jan"),
                "id", new AttributeValue("abc-123")
        ));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        verifyNoInteractions(sesClient);
    }

    @Test
    void givenInsertWithBlankEmailShouldNotSend() {
        // Given
        DynamodbEvent event = insertEvent(Map.of(
                "email", new AttributeValue(""),
                "id", new AttributeValue("abc-123")
        ));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        verifyNoInteractions(sesClient);
    }

    @Test
    void givenNonInsertEventShouldNotSend() {
        // Given
        DynamodbEvent event = new DynamodbEvent();
        DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord = new DynamodbEvent.DynamodbStreamRecord();
        dynamodbStreamRecord.setEventName("MODIFY");
        event.setRecords(List.of(dynamodbStreamRecord));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        verifyNoInteractions(sesClient);
    }

    @Test
    void givenSesThrowingShouldNotPropagateOutOfHandler() {
        // Given
        DynamodbEvent event = insertEvent(Map.of(
                "email", new AttributeValue("jan.kowalski@example.com"),
                "id", new AttributeValue("abc-123")
        ));
        when(sesClient.sendEmail(any(SendEmailRequest.class))).thenThrow(new RuntimeException("SES throttled"));

        // When / Then (must not throw)
        notifier.handleRequest(event, mockContext);

        verify(sesClient).sendEmail(any(SendEmailRequest.class));
    }

    @Test
    void givenPolishDiacriticsInFirstNameShouldRenderCorrectlyInBody() {
        // Given
        DynamodbEvent event = insertEvent(Map.of(
                "email", new AttributeValue("agnieszka@example.com"),
                "submitter_first_name", new AttributeValue("Łukasz"),
                "id", new AttributeValue("xyz-789")
        ));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        ArgumentCaptor<SendEmailRequest> captor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(sesClient).sendEmail(captor.capture());
        assert captor.getValue().content().simple().body().text().data().contains("Łukasz");
    }

    private DynamodbEvent insertEvent(Map<String, AttributeValue> newImage) {
        DynamodbEvent event = new DynamodbEvent();
        DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord = new DynamodbEvent.DynamodbStreamRecord();
        dynamodbStreamRecord.setEventName("INSERT");
        dynamodbStreamRecord.setDynamodb(new StreamRecord().withNewImage(newImage));
        event.setRecords(List.of(dynamodbStreamRecord));
        return event;
    }
}
