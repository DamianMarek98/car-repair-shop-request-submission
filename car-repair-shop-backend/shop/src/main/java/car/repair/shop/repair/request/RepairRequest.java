package car.repair.shop.repair.request;

import car.repair.shop.commons.aggregate.PreferredVisitWindow;
import lombok.AccessLevel;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter(AccessLevel.PACKAGE)
class RepairRequest {
    private RepairRequestId repairRequestId;
    private String vin;
    private String issueDescription;
    private String name;
    private String email;
    private String phoneNumber;
    private List<PreferredVisitWindow> preferredVisitWindows;
    private LocalDateTime submittedAt;
    private LocalDateTime handledAt;
    private RepairRequestStatus repairRequestStatus;

    protected void markAsHandled() {
        handledAt = LocalDateTime.now();
        repairRequestStatus = RepairRequestStatus.HANDLED;
    }

    protected void maskAsAppointmentMade() {
        repairRequestStatus = RepairRequestStatus.APPOINTMENT_MADE;
    }
}
