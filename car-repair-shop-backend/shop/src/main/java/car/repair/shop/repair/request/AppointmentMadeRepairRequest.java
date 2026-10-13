package car.repair.shop.repair.request;

import car.repair.shop.repair.request.exception.RepairRequestStateException;

import java.time.LocalDateTime;

class AppointmentMadeRepairRequest extends RepairRequestState {
    public AppointmentMadeRepairRequest(RepairRequest repairRequest) {
        super(repairRequest);
    }

    @Override
    void setAppointment(LocalDateTime appointmentAt) {
        throw new RepairRequestStateException("Cannot set appointment when appointment was already made");
    }

    @Override
    void markAsAppointmentMade() {
        throw new RepairRequestStateException("Cannot mark as appointment made when appointment was already made");
    }
}
