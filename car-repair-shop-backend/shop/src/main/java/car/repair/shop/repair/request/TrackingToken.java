package car.repair.shop.repair.request;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Secret for the customer's status link ({@code /status/{token}}). 256 bits from
 * {@link SecureRandom}, base64url without padding (43 chars).
 * <p>
 * Mirrored in repair-request-submitted-consumer ({@code RepairRequestItemConverter}) - keep both
 * generators identical.
 */
final class TrackingToken {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private TrackingToken() {
    }

    static String generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
