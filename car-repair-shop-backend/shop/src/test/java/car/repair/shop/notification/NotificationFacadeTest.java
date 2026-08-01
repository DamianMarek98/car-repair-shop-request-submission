package car.repair.shop.notification;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationFacadeTest {

    @Mock
    private ReviewRequestEmailSender sender;

    @Test
    void shouldReturnTrueWhenEmailWasSent() {
        var facade = new NotificationFacade(sender);

        assertThat(facade.sendReviewRequestEmail("customer@test.com", "Damian")).isTrue();
        verify(sender).send("customer@test.com", "Damian");
    }

    @Test
    void shouldSwallowSesFailureAndReturnFalse() {
        doThrow(SesV2Exception.builder().message("SES is down").build())
                .when(sender).send("customer@test.com", "Damian");
        var facade = new NotificationFacade(sender);

        assertThat(facade.sendReviewRequestEmail("customer@test.com", "Damian")).isFalse();
    }
}
