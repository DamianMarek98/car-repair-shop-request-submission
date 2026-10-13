package car.repair.shop.repair.request;

import car.repair.shop.repair.request.exception.RepairRequestStateException;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertThrows;

class AppointmentMadeRepairRequestTest {
    @Test
    void shouldThrowRepairRequestStateException_whenSetAppointmentOnAppointmentMadeRepairRequest() {
        var repairRequest = new RepairRequest();
        var appointmentMadeRepairRequest = new AppointmentMadeRepairRequest(repairRequest);

        assertThrows(RepairRequestStateException.class,
                () -> appointmentMadeRepairRequest.setAppointment(LocalDateTime.of(2026, 9, 23, 7, 0)));
    }

    @Test
    void shouldThrowRepairRequestStateException_whenMarkAsAppointedAppointmentMadeRepairRequest() {
        var repairRequest = new RepairRequest();
        var appointmentMadeRepairRequest = new AppointmentMadeRepairRequest(repairRequest);

        assertThrows(RepairRequestStateException.class, appointmentMadeRepairRequest::markAsAppointmentMade);
    }
}
