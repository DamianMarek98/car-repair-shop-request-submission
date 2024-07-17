package car.repair.shop.availability;

import java.time.LocalDate;

public record UnavailableDateDto(String id, LocalDate date) {
}
