package car.repair.shop.repair.request.controller.dto;

import car.repair.shop.repair.request.RepairRequest;
import car.repair.shop.repair.request.RepairRequestStatus;

import java.time.LocalDateTime;

public record RepairRequestListItem(String id, String vin, String firstName, String lastName, RepairRequestStatus status,
                                    LocalDateTime submittedAt) {

    public static RepairRequestListItem from(RepairRequest repairRequest) {
        return new RepairRequestListItem(repairRequest.getId(),
                repairRequest.getVin(),
                repairRequest.getSubmitterFirstName(),
                repairRequest.getSubmitterLastName(),
                repairRequest.getStatus(),
                repairRequest.getSubmittedAt());
    }
}
