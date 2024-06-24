package car.repair.shop.repair.request;

import car.repair.shop.repair.request.exception.RepairRequestStateException;
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
        assertThat(repairRequest.getStatus()).isEqualTo(RepairRequestStatus.APPOINTMENT_MADE);
    }
}
