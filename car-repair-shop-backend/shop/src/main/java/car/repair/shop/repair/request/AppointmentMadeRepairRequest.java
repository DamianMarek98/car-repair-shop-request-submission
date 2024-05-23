package car.repair.shop.repair.request;

class AppointmentMadeRepairRequest extends  RepairRequestState {
    public AppointmentMadeRepairRequest(RepairRequest repairRequest) {
        super(repairRequest);
    }

    @Override
    void markAsHandled() {
        throw new RepairRequestStateException("Cannot handle when appointment was already made");
    }

    @Override
    void markAsAppointmentMade() {
        throw new RepairRequestStateException("Cannot mark as appointment made when appointment was already made");
    }
}
