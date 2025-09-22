package car.repair.shop;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import software.amazon.awssdk.annotations.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static car.repair.shop.PhoneNumberPattern.PHONE_NUMBER_PATTERN;

/**
 * Data Transfer Object for submitting a repair request.
 * As this DTO is used in the sqs consumer service, validation annotations are not applied here.
 * @param vin
 * @param plateNumber
 * @param issueDescription
 * @param firstName
 * @param lastName
 * @param email
 * @param phoneNumber
 * @param timeSlots
 * @param asap
 * @param rodo
 */
public record SubmitRepairRequestDto(@Size(min = 17, max = 17, message = "The length of vin must be exactly 17 characters") String vin,
                                     @Size(min = 6, max = 7, message = "The length of plate number must be 6 or 7 characters") String plateNumber,
                                     @NotNull @Size(max = 500, message = "Max issue description length is 500 characters") String issueDescription,
                                     @NotNull String firstName,
                                     @NotNull String lastName,
                                     @NotNull @Email(message = "Email should be valid") String email,
                                     @NotNull @Pattern(regexp = PHONE_NUMBER_PATTERN, message = "Phone number should be valid") String phoneNumber,
                                     List<TimeSlotDto> timeSlots,
                                     boolean asap,
                                     boolean rodo) {

    public record TimeSlotDto(@NotNull LocalDate date, LocalTime from, LocalTime to) {

    }
}
