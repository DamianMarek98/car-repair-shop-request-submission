import car.repair.shop.notification.NewRepairRequestSubmittedSnsNotifier;
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
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NewRepairRequestSubmittedSnsNotifierTest {

    public static final String ARN = "arn:aws:sns:eu-north-1:009160054371:NewRepairRequestSubmittedTopic";
    private NewRepairRequestSubmittedSnsNotifier notifier;
    private SnsClient snsClient;

    @Mock
    private Context mockContext;

    @Mock
    private LambdaLogger mockLogger;

    @BeforeEach
    void setUp() {
        snsClient = mock(SnsClient.class);
        notifier = new NewRepairRequestSubmittedSnsNotifier(snsClient);
        when(mockContext.getLogger()).thenReturn(mockLogger);
    }

    @Test
    void givenInsertEventShouldPublishNotification() {
        // Given
        final DynamodbEvent event = new DynamodbEvent();
        final DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord = new DynamodbEvent.DynamodbStreamRecord();
        dynamodbStreamRecord.setEventName("INSERT");
        dynamodbStreamRecord.setDynamodb(new StreamRecord().withNewImage(
                Map.of(
                        "submitter_first_name", new AttributeValue("Damian"),
                        "submitter_last_name", new AttributeValue("Marek")
                )
        ));
        event.setRecords(List.of(dynamodbStreamRecord));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        ArgumentCaptor<PublishRequest> captor = ArgumentCaptor.forClass(PublishRequest.class);
        verify(snsClient).publish(captor.capture());

        PublishRequest capturedRequest = captor.getValue();
        assert capturedRequest.message().equals("Nowe zgłoszenie od Damian Marek! Obsłuż na https://portal.renocar-zgloszenie.pl/");
        assert capturedRequest.topicArn().equals(ARN);
    }

    @Test
    void givenInsertWithoutNameAndLastNameEventShouldPublishNotificationWithEmptyData() {
        // Given
        final DynamodbEvent event = new DynamodbEvent();
        final DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord = new DynamodbEvent.DynamodbStreamRecord();
        dynamodbStreamRecord.setEventName("INSERT");
        dynamodbStreamRecord.setDynamodb(new StreamRecord().withNewImage(
                Map.of("other_field", new AttributeValue("value"))
        ));
        event.setRecords(List.of(dynamodbStreamRecord));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        ArgumentCaptor<PublishRequest> captor = ArgumentCaptor.forClass(PublishRequest.class);
        verify(snsClient).publish(captor.capture());

        PublishRequest capturedRequest = captor.getValue();
        assert capturedRequest.message().equals("Nowe zgłoszenie od  ! Obsłuż na https://portal.renocar-zgloszenie.pl/");
        assert capturedRequest.topicArn().equals(ARN);
    }

    @Test
    void givenNonInsertEventShouldNotPublishNotification() {
        // Given
        final DynamodbEvent event = new DynamodbEvent();
        final DynamodbEvent.DynamodbStreamRecord dynamodbStreamRecord = new DynamodbEvent.DynamodbStreamRecord();
        dynamodbStreamRecord.setEventName("MODIFY");
        event.setRecords(List.of(dynamodbStreamRecord));

        // When
        notifier.handleRequest(event, mockContext);

        // Then
        verifyNoInteractions(snsClient);
    }
}
