package car.repair.shop.repair.request.controller.dto;

import car.repair.shop.repair.request.RepairRequest;
import car.repair.shop.repair.request.RepairRequestStatus;

import java.time.LocalDateTime;
import java.util.List;

public record RepairRequestDto(String id,
                               String vin,
                               String issueDescription,
                               String submitterFirstName,
                               String submitterLastName,
                               String email,
                               String phoneNumber,
                               boolean asap,
                               List<PreferredVisitWindowDto> preferredVisitWindows,
                               LocalDateTime submittedAt,
                               LocalDateTime handledAt,
                               RepairRequestStatus status) {

    public static RepairRequestDto from(RepairRequest repairRequest, List<PreferredVisitWindowDto> preferredVisitWindows) {
        return new RepairRequestDto(repairRequest.getId(),
                repairRequest.getVin(),
                repairRequest.getIssueDescription(),
                repairRequest.getSubmitterFirstName(),
                repairRequest.getSubmitterLastName(),
                repairRequest.getEmail(),
                repairRequest.getPhoneNumber(),
                repairRequest.isAsap(),
                preferredVisitWindows,
                repairRequest.getSubmittedAt(),
                repairRequest.getHandledAt(),
                repairRequest.getStatus());
    }
}

