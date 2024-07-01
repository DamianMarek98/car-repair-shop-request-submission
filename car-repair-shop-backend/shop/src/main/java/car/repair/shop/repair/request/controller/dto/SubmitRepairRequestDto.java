package car.repair.shop.repair.request.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static car.repair.shop.commons.patterns.PhoneNumberPattern.PHONE_NUMBER_PATTERN;

public record SubmitRepairRequestDto(@NotNull @Size(min = 17, max = 17, message = "The length of vin must be exactly 17 characters") String vin,
                                     @NotNull @Size(max = 500, message = "Max issue description length is 500 characters") String issueDescription,
                                     @NotNull String firstName,
                                     @NotNull String lastName,
                                     @NotNull @Email(message = "Email should be valid") String email,
                                     @NotNull @Pattern(regexp = PHONE_NUMBER_PATTERN, message = "Phone number should be valid") String phoneNumber,
                                     List<TimeSlotDto> timeSlots,
                                     boolean asap) {

    public record TimeSlotDto(@NotNull LocalDate date, LocalTime from, LocalTime to) {

    }
}
