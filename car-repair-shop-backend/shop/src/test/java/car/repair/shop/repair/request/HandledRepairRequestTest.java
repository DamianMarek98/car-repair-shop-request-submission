package car.repair.shop.repair.request;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class HandledRepairRequestTest {
    @Test
    void shouldChangeAppointment_whenSetAppointmentOnHandledRepairRequest() {
        var repairRequest = new RepairRequest();
        repairRequest.setStatus(RepairRequestStatus.HANDLED);
        repairRequest.setAppointmentAt(LocalDateTime.of(2026, 9, 23, 7, 0));
        var handledRepairRequest = new HandledRepairRequest(repairRequest);
        var newAppointmentAt = LocalDateTime.of(2026, 9, 24, 12, 30);

        handledRepairRequest.setAppointment(newAppointmentAt);

        assertThat(repairRequest.getAppointmentAt()).isEqualTo(newAppointmentAt);
        assertThat(repairRequest.getStatus()).isEqualTo(RepairRequestStatus.HANDLED);
        assertNull(repairRequest.getHandledAt());
    }

    @Test
    void shouldMarkAsAppointmentMade_whenMarkAsAppointmentMadeHandledRepairRequest() {
        var repairRequest = new RepairRequest();
        var handledRepairRequest = new HandledRepairRequest(repairRequest);

        handledRepairRequest.markAsAppointmentMade();

        assertNull(repairRequest.getHandledAt());
        assertNotNull(repairRequest.getCompletedAt());
        assertThat(repairRequest.getStatus()).isEqualTo(RepairRequestStatus.APPOINTMENT_MADE);
    }
}
