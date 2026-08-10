package car.repair.shop.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

@Component
@RequiredArgsConstructor
class ReviewRequestEmailSender {

    private static final String CHARSET = "UTF-8";
    private static final String SUBJECT = "Dziękujemy za wizytę w RENO CAR";
    static final String SES_FROM = "info@renocar-zgloszenie.pl";
    static final String SES_REPLY_TO = "info@renocar.pl";
    static final String SHOP_PHONE_NUMBER = "58 520 19 14 lub 690 182 354";
    static final String GOOGLE_REVIEW_URL = "https://g.page/r/CQ_cWwjuGs0AEAE/review";

    private final SesV2Client sesClient;

    void send(String toEmail, String firstName) {
        sesClient.sendEmail(buildSendEmailRequest(toEmail, firstName));
    }

    static SendEmailRequest buildSendEmailRequest(String toEmail, String firstName) {
        return SendEmailRequest.builder()
                .fromEmailAddress(SES_FROM)
                .replyToAddresses(SES_REPLY_TO)
                .destination(Destination.builder().toAddresses(toEmail).build())
                .content(EmailContent.builder()
                        .simple(Message.builder()
                                .subject(Content.builder().data(SUBJECT).charset(CHARSET).build())
                                .body(Body.builder()
                                        .text(Content.builder()
                                                .data(buildBody(firstName))
                                                .charset(CHARSET)
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
    }

    static String buildBody(String firstName) {
        String name = firstName == null ? "" : firstName;
        return """
                Dzień dobry %s,

                dziękujemy za skorzystanie z usług naszego warsztatu. Twoje zgłoszenie zostało zakończone.

                Będziemy wdzięczni za podzielenie się opinią — zajmie to mniej niż minutę:
                %s

                W razie pytań prosimy o kontakt: tel. %s.

                Pozdrawiamy,
                Zespół RENO CAR

                ---
                Otrzymujesz tę wiadomość, ponieważ przy składaniu zgłoszenia wyraziłeś/aś zgodę na \
                prośbę o opinię. Aby wycofać zgodę, odpowiedz na tę wiadomość lub zadzwoń do warsztatu.
                """.formatted(name, GOOGLE_REVIEW_URL, SHOP_PHONE_NUMBER);
    }
}
