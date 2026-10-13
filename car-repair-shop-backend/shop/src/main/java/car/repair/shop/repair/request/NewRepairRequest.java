package car.repair.shop.repair.request;


import java.time.LocalDateTime;

class NewRepairRequest extends RepairRequestState {

    public NewRepairRequest(RepairRequest repairRequest) {
        super(repairRequest);
    }

    @Override
    void setAppointment(LocalDateTime appointmentAt) {
        repairRequest.markAsHandled();
        repairRequest.setAppointment(appointmentAt);
    }

    @Override
    void markAsAppointmentMade() {
        repairRequest.markAsHandled();
        repairRequest.maskAsAppointmentMade();
    }
}
