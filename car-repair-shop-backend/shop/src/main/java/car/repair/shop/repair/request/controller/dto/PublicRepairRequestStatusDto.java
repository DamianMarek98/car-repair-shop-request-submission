package car.repair.shop.repair.request.controller.dto;

import car.repair.shop.repair.request.RepairRequestStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * What the customer's status page (unauthenticated, reached by a secret link) may see.
 * <p>
 * This is an allowlist: {@code vin}, {@code phoneNumber} and {@code email} arrive here already
 * masked, and the request id, last name and tracking token are never part of it. Adding a field
 * exposes it publicly - extend the leak test in {@code PublicRepairRequestStatusIntegrationTest}.
 */
public record PublicRepairRequestStatusDto(RepairRequestStatus status,
                                           String submitterFirstName,
                                           String plateNumber,
                                           String vin,
                                           String phoneNumber,
                                           String email,
                                           String issueDescription,
                                           boolean asap,
                                           List<PreferredVisitWindowDto> preferredVisitWindows,
                                           LocalDateTime submittedAt,
                                           LocalDateTime appointmentAt,
                                           LocalDateTime completedAt) {
}
