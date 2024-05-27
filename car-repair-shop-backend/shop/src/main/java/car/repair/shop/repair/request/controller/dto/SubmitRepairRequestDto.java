package car.repair.shop.repair.request.controller.dto;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record SubmitRepairRequestDto(@NotNull @Size(min = 17, max = 17, message = "The length of vin must be exactly 17 characters") String vin,
                                     @NotNull @Size(max = 500, message = "Max issue description length is 500 characters") String issueDescription,
                                     @NotNull String firstName,
                                     @NotNull String lastName,
                                     @NotNull String email,
                                     @NotNull String phoneNumber,
                                     List<TimeSlot> timeSlots,
                                     boolean asap) {

    public record TimeSlot(@NotNull LocalDate date, LocalTime from, LocalTime to) {

    }
}
