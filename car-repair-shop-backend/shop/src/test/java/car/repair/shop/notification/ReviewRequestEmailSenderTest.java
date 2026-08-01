package car.repair.shop.notification;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReviewRequestEmailSenderTest {

    @Mock
    private SesV2Client sesClient;

    @Test
    void shouldSendEmailWithConfiguredAddressesAndUtf8Charset() {
        var sender = new ReviewRequestEmailSender(sesClient);

        sender.send("customer@test.com", "Damian");

        ArgumentCaptor<SendEmailRequest> captor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(sesClient).sendEmail(captor.capture());

        SendEmailRequest request = captor.getValue();
        assertThat(request.fromEmailAddress()).isEqualTo(ReviewRequestEmailSender.SES_FROM);
        assertThat(request.replyToAddresses()).containsExactly(ReviewRequestEmailSender.SES_REPLY_TO);
        assertThat(request.destination().toAddresses()).containsExactly("customer@test.com");

        var message = request.content().simple();
        assertThat(message.subject().charset()).isEqualTo("UTF-8");
        assertThat(message.body().text().charset()).isEqualTo("UTF-8");
        assertThat(message.subject().data()).contains("Dziękujemy za wizytę");
    }

    @Test
    void bodyShouldContainNameReviewLinkPhoneAndWithdrawalNotice() {
        String body = ReviewRequestEmailSender.buildBody("Damian");

        assertThat(body).contains("Dzień dobry Damian,");
        assertThat(body).contains(ReviewRequestEmailSender.GOOGLE_REVIEW_URL);
        assertThat(body).contains(ReviewRequestEmailSender.SHOP_PHONE_NUMBER);
        assertThat(body).contains("Aby wycofać zgodę");
    }

    @Test
    void bodyShouldNotContainPromotionalContent() {
        // the consent covers a review request and nothing else - see spec/04 section 6.7
        String body = ReviewRequestEmailSender.buildBody("Damian").toLowerCase();

        assertThat(body).doesNotContain("promocj", "rabat", "zniżk", "oferta");
    }

    @Test
    void shouldTolerateMissingFirstName() {
        String body = ReviewRequestEmailSender.buildBody(null);

        assertThat(body).startsWith("Dzień dobry ,");
    }
}
