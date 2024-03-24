package car.repair.shop.commons.aggregate;

import org.springframework.lang.NonNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record PreferredVisitDate(@NonNull LocalDate date, LocalTime from, LocalTime to) {
}
