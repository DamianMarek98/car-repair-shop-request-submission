package car.repair.shop.notification;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.util.Map;

public class NewRepairRequestSubmittedSnsNotifier implements RequestHandler<DynamodbEvent, String> {

    private final SnsClient snsClient;
    private static final String TOPIC_ARN = "arn:aws:sns:eu-north-1:009160054371:NewRepairRequestSubmittedTopic";


    public NewRepairRequestSubmittedSnsNotifier() {
        this.snsClient = SnsClient.create();
    }

    public NewRepairRequestSubmittedSnsNotifier(SnsClient snsClient) {
        this.snsClient = snsClient;
    }

    @Override
    public String handleRequest(DynamodbEvent event, Context context) {
        for (DynamodbEvent.DynamodbStreamRecord dynamodbRecord : event.getRecords()) {
            if ("INSERT".equals(dynamodbRecord.getEventName())) {
                String message = prepareNotificationMessage(dynamodbRecord);

                snsClient.publish(PublishRequest.builder()
                        .topicArn(TOPIC_ARN)
                        .message(message)
                        .build());
            }
        }
        return "Notifications sent.";
    }

    private static String prepareNotificationMessage(DynamodbEvent.DynamodbStreamRecord dynamodbRecord) {
        Map<String, AttributeValue> newItem = dynamodbRecord.getDynamodb().getNewImage();

        AttributeValue submitterFirstNameItem = newItem.get("submitter_first_name");
        String firstName = submitterFirstNameItem == null ? "" : submitterFirstNameItem.getS();
        AttributeValue submitterLastNameItem = newItem.get("submitter_last_name");
        String lastName = submitterLastNameItem == null ? "" : submitterLastNameItem.getS();
        return String.format("Nowe zgłoszenie od %s %s! Obsłuż na https://portal.renocar-zgloszenie.pl/", firstName, lastName);
    }
}
