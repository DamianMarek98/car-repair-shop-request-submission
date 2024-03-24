package car.repair.shop.request;

import car.repair.shop.commons.aggregate.Version;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
class HandledRepairRequest implements RepairRequest {
    private RepairRequestId repairRequestId;
    private Version version;
    private LocalDateTime handledAt;
}
