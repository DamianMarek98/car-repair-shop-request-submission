package car.repair.shop.repair.request;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public abstract class RepairRequestState {
    final RepairRequest repairRequest;

    //todo should return repair request in new state
    abstract void markAsHandled();
    abstract void markAsAppointmentMade();
}
