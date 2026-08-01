package car.repair.shop.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Public entry point of the notification module - customer-facing e-mails sent from the
 * monolith. Everything else in this package is package-private on purpose.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationFacade {
    private final ReviewRequestEmailSender reviewRequestEmailSender;

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
}
