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
    private static final String TEST_SUBMISSION_FIRST_NAME = "test";


    public NewRepairRequestSubmittedSnsNotifier() {
        this.snsClient = SnsClient.create();
    }

    public NewRepairRequestSubmittedSnsNotifier(SnsClient snsClient) {
        this.snsClient = snsClient;
    }

    @Override
    public String handleRequest(DynamodbEvent event, Context context) {
        context.getLogger().log("Processing " + event.getRecords().size() + " DynamoDB records");
        for (DynamodbEvent.DynamodbStreamRecord dynamodbRecord : event.getRecords()) {
            context.getLogger().log("Event name: " + dynamodbRecord.getEventName());
            if ("INSERT".equals(dynamodbRecord.getEventName())) {
                try {
                    Map<String, AttributeValue> newItem = dynamodbRecord.getDynamodb().getNewImage();
                    if (isTestSubmission(newItem)) {
                        context.getLogger().log("Skipping SNS notification for test submission");
                        continue;
                    }
                    String message = prepareNotificationMessage(newItem);
                    context.getLogger().log(message);
                    snsClient.publish(PublishRequest.builder()
                            .topicArn(TOPIC_ARN)
                            .message(message)
                            .build());
                } catch (Exception e) {
                    context.getLogger().log("Error publishing SNS message: " + e.getMessage());
                }
            }
        }
        return "Notifications sent.";
    }

    private static boolean isTestSubmission(Map<String, AttributeValue> newItem) {
        AttributeValue firstNameItem = newItem.get("submitter_first_name");
        String firstName = firstNameItem == null ? "" : firstNameItem.getS();
        return firstName != null && TEST_SUBMISSION_FIRST_NAME.equalsIgnoreCase(firstName.trim());
    }

    private static String prepareNotificationMessage(Map<String, AttributeValue> newItem) {
        AttributeValue submitterFirstNameItem = newItem.get("submitter_first_name");
        String firstName = submitterFirstNameItem == null ? "" : submitterFirstNameItem.getS();
        AttributeValue submitterLastNameItem = newItem.get("submitter_last_name");
        String lastName = submitterLastNameItem == null ? "" : submitterLastNameItem.getS();
        return String.format("Nowe zgłoszenie od %s %s! Obsłuż na https://portal.renocar-zgloszenie.pl/", firstName, lastName);
    }
}
