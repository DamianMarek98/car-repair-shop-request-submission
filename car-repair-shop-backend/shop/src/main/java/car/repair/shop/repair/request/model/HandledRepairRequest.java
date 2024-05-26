package car.repair.shop.repair.request.model;

import car.repair.shop.repair.request.exception.RepairRequestStateException;

class HandledRepairRequest extends RepairRequestState {
    public HandledRepairRequest(RepairRequest repairRequest) {
        super(repairRequest);
    }

    @Override
    void markAsHandled() {
        throw new RepairRequestStateException("Cannot handle already handled repair request");
    }

    @Override
    void markAsAppointmentMade() {
        repairRequest.maskAsAppointmentMade();
    }
}
