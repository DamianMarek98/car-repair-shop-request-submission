package car.repair.shop.repair.request.model;

import car.repair.shop.repair.request.exception.RepairRequestStateException;
import car.repair.shop.repair.request.model.HandledRepairRequest;
import car.repair.shop.repair.request.model.RepairRequest;
import car.repair.shop.repair.request.model.RepairRequestStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class HandledRepairRequestTest {
    @Test
    void shouldThrowRepairRequestStateException_whenHandleHandledRepair() {
        var repairRequest = new RepairRequest();
        var handledRepairRequest = new HandledRepairRequest(repairRequest);

        assertThrows(RepairRequestStateException.class, handledRepairRequest::markAsHandled);
    }

    @Test
    void shouldMarkAsAppointmentMade_whenMarkAsAppointmentMadeHandledRepairRequest() {
        var repairRequest = new RepairRequest();
        var handledRepairRequest = new HandledRepairRequest(repairRequest);

        handledRepairRequest.markAsAppointmentMade();

        assertNull(repairRequest.getHandledAt());
        assertThat(repairRequest.getRepairRequestStatus()).isEqualTo(RepairRequestStatus.APPOINTMENT_MADE);
    }
}