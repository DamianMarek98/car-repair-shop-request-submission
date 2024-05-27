package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import lombok.AccessLevel;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

//todo either private setters for @document or AllArgsConstructor
@Getter(AccessLevel.PACKAGE)
class RepairRequest {
    private RepairRequestId repairRequestId;
    private String vin;
    private String issueDescription;
    private String submitterFirstName;
    private String submitterLastName;
    private String email;
    private String phoneNumber;
    private List<PreferredVisitWindow> preferredVisitWindows;
    private LocalDateTime submittedAt;
    private LocalDateTime handledAt;
    private RepairRequestStatus repairRequestStatus;

    static RepairRequest from(SubmitRepairRequestDto submitRepairRequestDto) {
        var repairRequest = new RepairRequest();
        //todo
        return repairRequest;
    }

    protected void markAsHandled() {
        handledAt = LocalDateTime.now();
        repairRequestStatus = RepairRequestStatus.HANDLED;
    }

    protected void maskAsAppointmentMade() {
        repairRequestStatus = RepairRequestStatus.APPOINTMENT_MADE;
    }
}
