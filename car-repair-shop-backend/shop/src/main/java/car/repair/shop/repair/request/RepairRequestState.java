package car.repair.shop.repair.request;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
abstract class RepairRequestState {
    protected final RepairRequest repairRequest;

    abstract void markAsHandled();
    abstract void markAsAppointmentMade();
}
