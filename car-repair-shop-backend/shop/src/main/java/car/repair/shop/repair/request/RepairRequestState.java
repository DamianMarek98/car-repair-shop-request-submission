package car.repair.shop.repair.request;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public abstract class RepairRequestState {
    final RepairRequest repairRequest;

    abstract void markAsHandled();

    abstract void markAsAppointmentMade();
}
