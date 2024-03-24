package car.repair.shop.request;

import car.repair.shop.commons.aggregate.Version;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
class AppointmentMadeRepairRequest implements RepairRequest {
    private RepairRequestId repairRequestId;
    private Version version;
    private LocalDateTime appointedAt;
    private LocalDateTime appointedFor;
}
