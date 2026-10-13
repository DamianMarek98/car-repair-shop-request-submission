package car.repair.shop.repair.request;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class RepairRequestPublicStatusQueryHandlerTest {
    private static final LocalDateTime NOW_UTC = LocalDateTime.of(2026, 10, 13, 12, 0);

    @Test
    void completedRequestShouldStayAvailableFor90Days() {
        var repairRequest = completed();
        repairRequest.setCompletedAt(NOW_UTC.minusDays(89));

        assertThat(RepairRequestPublicStatusQueryHandler.isExpired(repairRequest, NOW_UTC)).isFalse();
    }

    @Test
    void completedRequestShouldExpireAfter90Days() {
        var repairRequest = completed();
        repairRequest.setCompletedAt(NOW_UTC.minusDays(91));

        assertThat(RepairRequestPublicStatusQueryHandler.isExpired(repairRequest, NOW_UTC)).isTrue();
    }

    @Test
    void shouldFallBackToHandledAtForRequestsCompletedBeforeCompletedAtExisted() {
        var repairRequest = completed();
        repairRequest.setSubmittedAt(NOW_UTC.minusDays(200));
        repairRequest.setHandledAt(NOW_UTC.minusDays(10));

        assertThat(RepairRequestPublicStatusQueryHandler.isExpired(repairRequest, NOW_UTC)).isFalse();

        repairRequest.setHandledAt(NOW_UTC.minusDays(91));

        assertThat(RepairRequestPublicStatusQueryHandler.isExpired(repairRequest, NOW_UTC)).isTrue();
    }

    @Test
    void shouldFallBackToSubmittedAtWhenNothingElseIsKnown() {
        var repairRequest = completed();
        repairRequest.setSubmittedAt(NOW_UTC.minusDays(91));

        assertThat(RepairRequestPublicStatusQueryHandler.isExpired(repairRequest, NOW_UTC)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = RepairRequestStatus.class, names = {"NEW", "HANDLED"})
    void openRequestShouldNeverExpire(RepairRequestStatus status) {
        var repairRequest = new RepairRequest();
        repairRequest.setStatus(status);
        repairRequest.setSubmittedAt(NOW_UTC.minusYears(3));
        repairRequest.setHandledAt(NOW_UTC.minusYears(2));

        assertThat(RepairRequestPublicStatusQueryHandler.isExpired(repairRequest, NOW_UTC)).isFalse();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {
            "",
            "short",
            // 42 and 44 chars
            "dvzTfzj-OGLRtfQr_1pw6R7dtfdOkt033kLcIVfBRS",
            "dvzTfzj-OGLRtfQr_1pw6R7dtfdOkt033kLcIVfBRSkA",
            // 43 chars, but not base64url
            "dvzTfzj-OGLRtfQr_1pw6R7dtfdOkt033kLcIVfBRS!",
            "dvzTfzj-OGLRtfQr_1pw6R7dtfdOkt033kLcIVfBRS="
    })
    void shouldRejectMalformedTokenWithoutQuerying(String token) {
        var repository = mock(RepairRequestTrackingRepository.class);
        var handler = new RepairRequestPublicStatusQueryHandler(repository);

        assertThat(handler.getByTrackingToken(token)).isEmpty();
        verifyNoInteractions(repository);
    }

    private static RepairRequest completed() {
        var repairRequest = new RepairRequest();
        repairRequest.setStatus(RepairRequestStatus.APPOINTMENT_MADE);
        return repairRequest;
    }
}
