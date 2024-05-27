package car.repair.shop.repair.request;


class NewRepairRequest extends RepairRequestState {

    public NewRepairRequest(RepairRequest repairRequest) {
        super(repairRequest);
    }

    @Override
    void markAsHandled() {
        repairRequest.markAsHandled();
    }

    @Override
    void markAsAppointmentMade() {
        repairRequest.markAsHandled();
        repairRequest.maskAsAppointmentMade();
    }
}
