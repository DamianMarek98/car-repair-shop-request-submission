package car.repair.shop.notification;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationFacadeTest {

    @Mock
    private ReviewRequestEmailSender sender;

    @Mock
    private AppointmentEmailSender appointmentSender;

    @Test
    void shouldReturnTrueWhenEmailWasSent() {
        var facade = new NotificationFacade(sender, appointmentSender);

        assertThat(facade.sendReviewRequestEmail("customer@test.com", "Damian")).isTrue();
        verify(sender).send("customer@test.com", "Damian");
    }

    @Test
    void shouldSwallowSesFailureAndReturnFalse() {
        doThrow(SesV2Exception.builder().message("SES is down").build())
                .when(sender).send("customer@test.com", "Damian");
        var facade = new NotificationFacade(sender, appointmentSender);

        assertThat(facade.sendReviewRequestEmail("customer@test.com", "Damian")).isFalse();
    }

    @Test
    void shouldSendAppointmentEmail() {
        var appointmentAt = LocalDateTime.of(2026, 9, 23, 7, 0);
        var facade = new NotificationFacade(sender, appointmentSender);

        assertThat(facade.sendAppointmentEmail("customer@test.com", "Damian", appointmentAt, false, "token")).isTrue();
        verify(appointmentSender).send("customer@test.com", "Damian", appointmentAt, false, "token");
    }

    @Test
    void shouldSwallowSesFailureOnAppointmentEmailAndReturnFalse() {
        var appointmentAt = LocalDateTime.of(2026, 9, 23, 7, 0);
        doThrow(SesV2Exception.builder().message("SES is down").build())
                .when(appointmentSender).send("customer@test.com", "Damian", appointmentAt, true, "token");
        var facade = new NotificationFacade(sender, appointmentSender);

        assertThat(facade.sendAppointmentEmail("customer@test.com", "Damian", appointmentAt, true, "token")).isFalse();
    }
}
