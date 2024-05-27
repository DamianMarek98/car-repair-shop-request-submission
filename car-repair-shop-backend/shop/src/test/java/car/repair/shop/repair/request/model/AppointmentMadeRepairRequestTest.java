package car.repair.shop.repair.request.model;

import car.repair.shop.repair.request.exception.RepairRequestStateException;
import car.repair.shop.repair.request.AppointmentMadeRepairRequest;
import car.repair.shop.repair.request.RepairRequest;
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
