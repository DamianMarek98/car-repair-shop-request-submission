package car.repair.shop.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Public entry point of the notification module - customer-facing e-mails sent from the
 * monolith. Everything else in this package is package-private on purpose.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationFacade {
    private final ReviewRequestEmailSender reviewRequestEmailSender;
    private final AppointmentEmailSender appointmentEmailSender;

    /**
     * Sends the post-visit "thank you / rate us" e-mail.
     * <p>
     * Never throws: this is secondary to the close action that triggers it, so a SES outage
     * must not fail closing a repair request. Callers get {@code false} and decide what to
     * tell the user.
     *
     * @return whether the e-mail was accepted by SES
     */
    public boolean sendReviewRequestEmail(String toEmail, String firstName) {
        try {
            reviewRequestEmailSender.send(toEmail, firstName);
            return true;
        } catch (Exception e) {
            log.error("Failed to send review request email to {}", toEmail, e);
            return false;
        }
    }

    /**
     * Tells the customer the visit time the workshop has set (or changed).
     * <p>
     * Never throws, for the same reason as {@link #sendReviewRequestEmail}: the appointment is
     * already saved and must not be rolled back by a SES failure.
     *
     * @param appointmentAtUtc visit time in UTC; the e-mail shows it in Europe/Warsaw
     * @param changed          true when an existing appointment was moved
     * @param trackingToken    the request's status-link secret; {@code null} (requests submitted
     *                         before the status page existed) leaves the link out of the e-mail
     * @return whether the e-mail was accepted by SES
     */
    public boolean sendAppointmentEmail(String toEmail, String firstName, LocalDateTime appointmentAtUtc,
                                        boolean changed, String trackingToken) {
        try {
            appointmentEmailSender.send(toEmail, firstName, appointmentAtUtc, changed, trackingToken);
            return true;
        } catch (Exception e) {
            log.error("Failed to send appointment email to {}", toEmail, e);
            return false;
        }
    }
}
