package car.repair.shop.repair.request;

import car.repair.shop.repair.request.exception.RepairRequestStateException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class AppointmentMadeRepairRequestTest {
    @Test
    void shouldThrowRepairRequestStateException_whenHandleAppointmentMadeRepairRequest() {
        var repairRequest = new RepairRequest();
        var appointmentMadeRepairRequest = new AppointmentMadeRepairRequest(repairRequest);

        assertThrows(RepairRequestStateException.class, appointmentMadeRepairRequest::markAsHandled);
    }

    @Test
    void shouldThrowRepairRequestStateException_whenMarkAsAppointedAppointmentMadeRepairRequest() {
        var repairRequest = new RepairRequest();
        var appointmentMadeRepairRequest = new AppointmentMadeRepairRequest(repairRequest);

        assertThrows(RepairRequestStateException.class, appointmentMadeRepairRequest::markAsAppointmentMade);
    }
}
