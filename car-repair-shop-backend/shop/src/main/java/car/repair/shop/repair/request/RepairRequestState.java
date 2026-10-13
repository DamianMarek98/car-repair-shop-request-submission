package car.repair.shop.repair.request;

import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;

@RequiredArgsConstructor
public abstract class RepairRequestState {
    final RepairRequest repairRequest;

    /**
     * Books the visit (NEW -> HANDLED) or changes an already booked one. The time is always
     * provided by the workshop.
     */
    abstract void setAppointment(LocalDateTime appointmentAt);

    abstract void markAsAppointmentMade();
}
