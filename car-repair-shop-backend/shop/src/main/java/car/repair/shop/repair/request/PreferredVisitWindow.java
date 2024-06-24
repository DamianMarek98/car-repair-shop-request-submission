package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import car.repair.shop.repair.request.exception.RepairRequestValidationException;
import org.springframework.lang.NonNull;

import java.time.LocalDate;
import java.time.LocalTime;

record PreferredVisitWindow(@NonNull LocalDate date, LocalTime from, LocalTime to) {

    static PreferredVisitWindow from(SubmitRepairRequestDto.TimeSlotDto timeSlotDto) {
        if (timeSlotDto.from() != null && timeSlotDto.to() != null && timeSlotDto.from().isAfter(timeSlotDto.to())) {
            throw new RepairRequestValidationException("Time slot from (" + timeSlotDto.from() + ") cannot be after time slot to (" + timeSlotDto.to() + ")!");
        }

        return new PreferredVisitWindow(timeSlotDto.date(), timeSlotDto.from(), timeSlotDto.to());
    }
}
