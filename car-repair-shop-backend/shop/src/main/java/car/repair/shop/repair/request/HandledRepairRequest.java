package car.repair.shop.repair.request;

import java.time.LocalDateTime;

class HandledRepairRequest extends RepairRequestState {
    public HandledRepairRequest(RepairRequest repairRequest) {
        super(repairRequest);
    }

    @Override
    void setAppointment(LocalDateTime appointmentAt) {
        repairRequest.setAppointment(appointmentAt);
    }

    @Override
    void markAsAppointmentMade() {
        repairRequest.maskAsAppointmentMade();
    }
}
