package car.repair.shop.notification;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AppointmentEmailSenderTest {

    private static final String BASE_URL = "https://renocar-zgloszenie.pl";
    private static final String TOKEN = "dvzTfzj-OGLRtfQr_1pw6R7dtfdOkt033kLcIVfBRSk";

    @Mock
    private SesV2Client sesClient;

    @Test
    void shouldSendEmailWithConfiguredAddressesAndUtf8Charset() {
        var sender = new AppointmentEmailSender(sesClient, BASE_URL);

        sender.send("customer@test.com", "Damian", LocalDateTime.of(2026, 9, 23, 7, 0), false, TOKEN);

        ArgumentCaptor<SendEmailRequest> captor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(sesClient).sendEmail(captor.capture());

        SendEmailRequest request = captor.getValue();
        assertThat(request.fromEmailAddress()).isEqualTo(ReviewRequestEmailSender.SES_FROM);
        assertThat(request.replyToAddresses()).containsExactly(ReviewRequestEmailSender.SES_REPLY_TO);
        assertThat(request.destination().toAddresses()).containsExactly("customer@test.com");

        var message = request.content().simple();
        assertThat(message.subject().charset()).isEqualTo("UTF-8");
        assertThat(message.body().text().charset()).isEqualTo("UTF-8");
        assertThat(message.subject().data()).isEqualTo(AppointmentEmailSender.SUBJECT);
        assertThat(message.body().text().data()).contains(BASE_URL + "/status/" + TOKEN);
    }

    @Test
    void shouldUseChangedSubjectWhenAppointmentWasMoved() {
        var request = AppointmentEmailSender.buildSendEmailRequest("customer@test.com", "Damian",
                LocalDateTime.of(2026, 9, 23, 7, 0), true, null);

        assertThat(request.content().simple().subject().data()).isEqualTo(AppointmentEmailSender.SUBJECT_CHANGED);
        assertThat(request.content().simple().body().text().data()).contains("został zmieniony");
    }

    @Test
    void shouldFormatSummerTimeInWarsawZone() {
        // 07:00 UTC = 09:00 CEST
        assertThat(AppointmentEmailSender.formatAppointment(LocalDateTime.of(2026, 9, 23, 7, 0)))
                .isEqualTo("środa, 23 września 2026, 09:00");
    }

    @Test
    void shouldFormatWinterTimeInWarsawZone() {
        // 07:00 UTC = 08:00 CET
        assertThat(AppointmentEmailSender.formatAppointment(LocalDateTime.of(2026, 11, 25, 7, 0)))
                .isEqualTo("środa, 25 listopada 2026, 08:00");
    }

    @Test
    void bodyShouldContainNameAppointmentAndPhone() {
        String body = AppointmentEmailSender.buildBody("Damian", LocalDateTime.of(2026, 9, 23, 7, 0), false, null);

        assertThat(body).contains("Dzień dobry Damian,");
        assertThat(body).contains("ustaliliśmy termin");
        assertThat(body).contains("środa, 23 września 2026, 09:00");
        assertThat(body).contains(ReviewRequestEmailSender.SHOP_PHONE_NUMBER);
    }

    @Test
    void shouldTolerateMissingFirstName() {
        String body = AppointmentEmailSender.buildBody(null, LocalDateTime.of(2026, 9, 23, 7, 0), false, null);

        assertThat(body).startsWith("Dzień dobry ,");
    }

    @Test
    void bodyShouldContainStatusLinkWhenProvided() {
        String statusUrl = AppointmentEmailSender.statusUrl(BASE_URL, TOKEN);

        String body = AppointmentEmailSender.buildBody("Damian", LocalDateTime.of(2026, 9, 23, 7, 0), false, statusUrl);

        assertThat(body).contains("Status zgłoszenia możesz sprawdzić tutaj:\nhttps://renocar-zgloszenie.pl/status/" + TOKEN + "\n\nPozdrawiamy,");
    }

    @Test
    void bodyShouldBeUnchangedWithoutStatusLink() {
        // requests submitted before the status page existed have no tracking token
        String body = AppointmentEmailSender.buildBody("Damian", LocalDateTime.of(2026, 9, 23, 7, 0), false, null);

        assertThat(body).doesNotContain("Status zgłoszenia", "/status/");
        assertThat(body).endsWith("tel. " + ReviewRequestEmailSender.SHOP_PHONE_NUMBER + ".\n\nPozdrawiamy,\nZespół RENO CAR\n");
    }

    @Test
    void statusUrlShouldBeNullWithoutTrackingToken() {
        assertThat(AppointmentEmailSender.statusUrl(BASE_URL, null)).isNull();
        assertThat(AppointmentEmailSender.statusUrl(BASE_URL, " ")).isNull();
    }

    @Test
    void statusUrlShouldTolerateTrailingSlashInBaseUrl() {
        assertThat(AppointmentEmailSender.statusUrl("http://localhost:4200/", TOKEN))
                .isEqualTo("http://localhost:4200/status/" + TOKEN);
    }
}
