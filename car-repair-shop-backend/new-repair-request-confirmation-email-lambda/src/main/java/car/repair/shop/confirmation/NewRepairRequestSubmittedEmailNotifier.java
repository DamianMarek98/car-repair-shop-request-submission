package car.repair.shop.confirmation;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.util.Map;

public class NewRepairRequestSubmittedEmailNotifier implements RequestHandler<DynamodbEvent, String> {

    private static final String CHARSET = "UTF-8";
    private static final String SUBJECT = "Potwierdzenie zgłoszenia naprawy — RENO CAR";

    // Fixed sending configuration — mirrors the sibling notifier's hardcoded TOPIC_ARN
    // convention. Not expected to change; redeploy the jar if it ever does.
    private static final Region SES_REGION = Region.EU_NORTH_1;
    private static final String SES_FROM = "info@renocar-zgloszenie.pl";
    private static final String SES_REPLY_TO = "info@renocar.pl";
    private static final String SHOP_PHONE_NUMBER = "58 520 19 14 lub 690 182 354";

    private final SesV2Client sesClient;
    private final String fromAddress;
    private final String replyTo;
    private final String shopPhoneNumber;

    public NewRepairRequestSubmittedEmailNotifier() {
        this(SesV2Client.builder().region(SES_REGION).build(), SES_FROM, SES_REPLY_TO, SHOP_PHONE_NUMBER);
    }

    public NewRepairRequestSubmittedEmailNotifier(SesV2Client sesClient, String fromAddress, String replyTo, String shopPhoneNumber) {
        this.sesClient = sesClient;
        this.fromAddress = fromAddress;
        this.replyTo = replyTo;
        this.shopPhoneNumber = shopPhoneNumber;
    }

    @Override
    public String handleRequest(DynamodbEvent event, Context context) {
        context.getLogger().log("Processing " + event.getRecords().size() + " DynamoDB records");
        for (DynamodbEvent.DynamodbStreamRecord dynamodbRecord : event.getRecords()) {
            if ("INSERT".equals(dynamodbRecord.getEventName())) {
                try {
                    sendConfirmationIfPossible(dynamodbRecord.getDynamodb().getNewImage(), context);
                } catch (Exception e) {
                    // per-record isolation: one bad/throttled record must not fail the batch
                    // or affect the sibling SNS notifier's independent event-source mapping
                    context.getLogger().log("Error sending confirmation email: " + e.getMessage());
                }
            }
        }
        return "Confirmation emails processed.";
    }

    private void sendConfirmationIfPossible(Map<String, AttributeValue> newImage, Context context) {
        String email = attr(newImage, "email");
        if (email == null || email.isBlank()) {
            // no address to send to; not logged as an error — see SPEC.md open question Q5
            return;
        }
        String firstName = attr(newImage, "submitter_first_name");
        String requestId = attr(newImage, "id");

        context.getLogger().log("Sending confirmation email for request " + requestId);
        sesClient.sendEmail(buildSendEmailRequest(fromAddress, replyTo, email, firstName, requestId, shopPhoneNumber));
    }

    static SendEmailRequest buildSendEmailRequest(String fromAddress, String replyTo, String toEmail,
                                                    String firstName, String requestId, String shopPhoneNumber) {
        SendEmailRequest.Builder requestBuilder = SendEmailRequest.builder()
                .fromEmailAddress(fromAddress)
                .destination(Destination.builder().toAddresses(toEmail).build())
                .content(EmailContent.builder()
                        .simple(Message.builder()
                                .subject(Content.builder().data(SUBJECT).charset(CHARSET).build())
                                .body(Body.builder()
                                        .text(Content.builder()
                                                .data(buildBody(firstName, requestId, shopPhoneNumber))
                                                .charset(CHARSET)
                                                .build())
                                        .build())
                                .build())
                        .build());

        if (replyTo != null && !replyTo.isBlank()) {
            requestBuilder.replyToAddresses(replyTo);
        }

        return requestBuilder.build();
    }

    static String buildBody(String firstName, String requestId, String shopPhoneNumber) {
        String name = firstName == null ? "" : firstName;
        return """
                Dzień dobry %s,

                dziękujemy za zgłoszenie naprawy w warsztacie RENO CAR. Otrzymaliśmy Twoje zgłoszenie \
                (nr %s) i skontaktujemy się z Tobą wkrótce, aby ustalić termin wizyty.

                W razie pytań prosimy o kontakt: tel. %s.

                Pozdrawiamy,
                Zespół RENO CAR
                """.formatted(name, requestId, shopPhoneNumber);
    }

    private static String attr(Map<String, AttributeValue> image, String key) {
        AttributeValue value = image.get(key);
        return value == null ? null : value.getS();
    }
}
