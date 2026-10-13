package car.repair.shop.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Component
class AppointmentEmailSender {

    private static final String CHARSET = "UTF-8";
    static final String SUBJECT = "Termin wizyty w RENO CAR";
    static final String SUBJECT_CHANGED = "Zmiana terminu wizyty w RENO CAR";
    static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Warsaw");
    private static final DateTimeFormatter APPOINTMENT_FORMAT =
            DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy, HH:mm", Locale.forLanguageTag("pl-PL"));

    private final SesV2Client sesClient;
    private final String statusPageBaseUrl;

    AppointmentEmailSender(SesV2Client sesClient,
                           @Value("${car.repair.shop.status-page-base-url:https://renocar-zgloszenie.pl}") String statusPageBaseUrl) {
        this.sesClient = sesClient;
        this.statusPageBaseUrl = statusPageBaseUrl;
    }

    void send(String toEmail, String firstName, LocalDateTime appointmentAtUtc, boolean changed, String trackingToken) {
        sesClient.sendEmail(buildSendEmailRequest(toEmail, firstName, appointmentAtUtc, changed,
                statusUrl(statusPageBaseUrl, trackingToken)));
    }

    static SendEmailRequest buildSendEmailRequest(String toEmail, String firstName, LocalDateTime appointmentAtUtc,
                                                  boolean changed, String statusUrl) {
        return SendEmailRequest.builder()
                .fromEmailAddress(ReviewRequestEmailSender.SES_FROM)
                .replyToAddresses(ReviewRequestEmailSender.SES_REPLY_TO)
                .destination(Destination.builder().toAddresses(toEmail).build())
                .content(EmailContent.builder()
                        .simple(Message.builder()
                                .subject(Content.builder().data(changed ? SUBJECT_CHANGED : SUBJECT).charset(CHARSET).build())
                                .body(Body.builder()
                                        .text(Content.builder()
                                                .data(buildBody(firstName, appointmentAtUtc, changed, statusUrl))
                                                .charset(CHARSET)
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
    }

    /**
     * @param statusUrl link to the customer's status page, or {@code null} to leave it out
     */
    static String buildBody(String firstName, LocalDateTime appointmentAtUtc, boolean changed, String statusUrl) {
        String name = firstName == null ? "" : firstName;
        String statusParagraph = statusUrl == null
                ? ""
                : "Status zgłoszenia możesz sprawdzić tutaj:\n" + statusUrl + "\n\n";
        String intro = changed
                ? "termin Twojej wizyty w warsztacie RENO CAR został zmieniony. Nowy termin:"
                : "ustaliliśmy termin Twojej wizyty w warsztacie RENO CAR:";
        return """
                Dzień dobry %s,

                %s

                %s

                Prosimy o przyjazd 10 minut wcześniej - ul. Andrzeja Struga 8, Gdańsk.

                Jeśli termin nie pasuje, prosimy o kontakt: tel. %s.

                %sPozdrawiamy,
                Zespół RENO CAR
                """.formatted(name, intro, formatAppointment(appointmentAtUtc), ReviewRequestEmailSender.SHOP_PHONE_NUMBER,
                statusParagraph);
    }

    /** {@code null} when the request has no tracking token - the e-mail then carries no link. */
    static String statusUrl(String baseUrl, String trackingToken) {
        if (!StringUtils.hasText(trackingToken)) {
            return null;
        }
        String base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return base + "/status/" + trackingToken;
    }

    /** Stored time is UTC; the customer reads the shop's local time. */
    static String formatAppointment(LocalDateTime appointmentAtUtc) {
        return appointmentAtUtc.atOffset(ZoneOffset.UTC)
                .atZoneSameInstant(SHOP_ZONE)
                .format(APPOINTMENT_FORMAT);
    }
}
