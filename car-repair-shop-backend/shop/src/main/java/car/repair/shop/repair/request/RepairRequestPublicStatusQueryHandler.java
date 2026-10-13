package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.PreferredVisitWindowDto;
import car.repair.shop.repair.request.controller.dto.PublicRepairRequestStatusDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Read side of the customer's status page. An unknown, malformed and expired token are
 * indistinguishable to the caller - all come back empty.
 */
@Service
@RequiredArgsConstructor
public class RepairRequestPublicStatusQueryHandler {
    // Shape produced by TrackingToken.generate(): 32 bytes, base64url, no padding
    private static final Pattern TOKEN_PATTERN = Pattern.compile("[A-Za-z0-9_-]{43}");
    static final int LINK_VALID_DAYS_AFTER_COMPLETION = 90;

    private final RepairRequestTrackingRepository repairRequestTrackingRepository;

    public Optional<PublicRepairRequestStatusDto> getByTrackingToken(String trackingToken) {
        if (trackingToken == null || !TOKEN_PATTERN.matcher(trackingToken).matches()) {
            return Optional.empty();
        }

        var repairRequests = repairRequestTrackingRepository.findByTrackingToken(trackingToken);
        if (repairRequests.size() != 1) {
            return Optional.empty();
        }

        var repairRequest = repairRequests.getFirst();
        if (isExpired(repairRequest, LocalDateTime.now(ZoneOffset.UTC))) {
            return Optional.empty();
        }
        return Optional.of(toDto(repairRequest));
    }

    /**
     * The link stops working 90 days after the visit was completed. Open requests never expire.
     * Requests completed before {@code completed_at} existed fall back to older timestamps.
     */
    static boolean isExpired(RepairRequest repairRequest, LocalDateTime nowUtc) {
        if (repairRequest.getStatus() != RepairRequestStatus.APPOINTMENT_MADE) {
            return false;
        }
        var completedAt = repairRequest.getCompletedAt() != null ? repairRequest.getCompletedAt()
                : repairRequest.getHandledAt() != null ? repairRequest.getHandledAt()
                : repairRequest.getSubmittedAt();
        return completedAt != null && completedAt.plusDays(LINK_VALID_DAYS_AFTER_COMPLETION).isBefore(nowUtc);
    }

    private static PublicRepairRequestStatusDto toDto(RepairRequest repairRequest) {
        List<PreferredVisitWindowDto> windows = repairRequest.getPreferredVisitWindows() == null ? List.of() :
                repairRequest.getPreferredVisitWindows().stream()
                        .map(PreferredVisitWindow::toDto)
                        .sorted(RepairRequestGetQueryHandler.getPreferredVisitWindowDtoComparator())
                        .toList();

        return new PublicRepairRequestStatusDto(repairRequest.getStatus(),
                repairRequest.getSubmitterFirstName(),
                repairRequest.getPlateNumber(),
                PersonalDataMask.vin(repairRequest.getVin()),
                PersonalDataMask.phoneNumber(repairRequest.getPhoneNumber()),
                PersonalDataMask.email(repairRequest.getEmail()),
                repairRequest.getIssueDescription(),
                repairRequest.isAsap(),
                windows,
                repairRequest.getSubmittedAt(),
                repairRequest.getAppointmentAt(),
                repairRequest.getCompletedAt());
    }
}
