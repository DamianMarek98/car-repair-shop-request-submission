package car.repair.shop;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalTimeSerializer;

import java.time.LocalDate;
import java.time.LocalTime;

record PreferredVisitWindow(@JsonSerialize(using = LocalDateSerializer.class) LocalDate date,
                            @JsonSerialize(using = LocalTimeSerializer.class) LocalTime from,
                            @JsonSerialize(using = LocalTimeSerializer.class) LocalTime to) {

    static PreferredVisitWindow from(SubmitRepairRequestDto.TimeSlotDto timeSlotDto) {
        if (timeSlotDto.from() != null && timeSlotDto.to() != null && timeSlotDto.from().isAfter(timeSlotDto.to())) {
            throw new RepairRequestValidationException("Time slot from (" + timeSlotDto.from() + ") cannot be after time slot to (" + timeSlotDto.to() + ")!");
        }

        return new PreferredVisitWindow(timeSlotDto.date(), timeSlotDto.from(), timeSlotDto.to());
    }
}
