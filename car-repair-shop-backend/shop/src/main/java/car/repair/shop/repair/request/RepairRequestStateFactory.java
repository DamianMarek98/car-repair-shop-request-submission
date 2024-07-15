package car.repair.shop.repair.request;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class RepairRequestStateFactory {
    public static RepairRequestState from(RepairRequest repairRequest) {
        return switch (repairRequest.getStatus()) {
            case NEW -> new NewRepairRequest(repairRequest);
            case APPOINTMENT_MADE -> new AppointmentMadeRepairRequest(repairRequest);
            case HANDLED -> new HandledRepairRequest(repairRequest);
        };
    }
}
