package car.repair.shop.repair.request.model;

import car.repair.shop.repair.request.NewRepairRequest;
import car.repair.shop.repair.request.RepairRequest;
import car.repair.shop.repair.request.RepairRequestStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class NewRepairRequestTest {

    @Test
    void shouldHandleNewRepair_whenHandleNewRepairRequest() {
        var repairRequest = new RepairRequest();
        var newRepairRequest = new NewRepairRequest(repairRequest);

        newRepairRequest.markAsHandled();

        assertNotNull(repairRequest.getHandledAt());
        assertThat(repairRequest.getRepairRequestStatus()).isEqualTo(RepairRequestStatus.HANDLED);
    }

    @Test
    void shouldHandleAndMarkAsAppointmentMade_whenMarkAsAppointmentMadeNewRepairRequest() {
        var repairRequest = new RepairRequest();
        var newRepairRequest = new NewRepairRequest(repairRequest);

        newRepairRequest.markAsAppointmentMade();

        assertNotNull(repairRequest.getHandledAt());
        assertThat(repairRequest.getRepairRequestStatus()).isEqualTo(RepairRequestStatus.APPOINTMENT_MADE);
    }
}
