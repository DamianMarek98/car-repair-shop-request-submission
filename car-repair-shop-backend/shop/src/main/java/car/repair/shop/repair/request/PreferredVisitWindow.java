package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import car.repair.shop.repair.request.exception.RepairRequestValidationException;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalTimeSerializer;
import org.springframework.lang.NonNull;

import java.time.LocalDate;
import java.time.LocalTime;

record PreferredVisitWindow(@NonNull
                            @JsonSerialize(using = LocalDateSerializer.class)
                            @JsonDeserialize(using = LocalDateDeserializer.class) LocalDate date,
                            @JsonSerialize(using = LocalTimeSerializer.class)
                            @JsonDeserialize(using = LocalTimeDeserializer.class) LocalTime from,
                            @JsonSerialize(using = LocalTimeSerializer.class)
                            @JsonDeserialize(using = LocalTimeDeserializer.class) LocalTime to) {

    static PreferredVisitWindow from(SubmitRepairRequestDto.TimeSlotDto timeSlotDto) {
        if (timeSlotDto.from() != null && timeSlotDto.to() != null && timeSlotDto.from().isAfter(timeSlotDto.to())) {
            throw new RepairRequestValidationException("Time slot from (" + timeSlotDto.from() + ") cannot be after time slot to (" + timeSlotDto.to() + ")!");
        }

        return new PreferredVisitWindow(timeSlotDto.date(), timeSlotDto.from(), timeSlotDto.to());
    }
}
