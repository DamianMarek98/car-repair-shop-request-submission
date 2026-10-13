package car.repair.shop.repair.request;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class NewRepairRequestTest {

    @Test
    void shouldHandleAndSetAppointment_whenSetAppointmentOnNewRepairRequest() {
        var repairRequest = new RepairRequest();
        var newRepairRequest = new NewRepairRequest(repairRequest);
        var appointmentAt = LocalDateTime.of(2026, 9, 23, 7, 0);

        newRepairRequest.setAppointment(appointmentAt);

        assertNotNull(repairRequest.getHandledAt());
        assertThat(repairRequest.getAppointmentAt()).isEqualTo(appointmentAt);
        assertThat(repairRequest.getStatus()).isEqualTo(RepairRequestStatus.HANDLED);
    }

    @Test
    void shouldHandleAndMarkAsAppointmentMade_whenMarkAsAppointmentMadeNewRepairRequest() {
        var repairRequest = new RepairRequest();
        var newRepairRequest = new NewRepairRequest(repairRequest);

        newRepairRequest.markAsAppointmentMade();

        assertNotNull(repairRequest.getHandledAt());
        assertNotNull(repairRequest.getCompletedAt());
        assertThat(repairRequest.getStatus()).isEqualTo(RepairRequestStatus.APPOINTMENT_MADE);
    }
}
