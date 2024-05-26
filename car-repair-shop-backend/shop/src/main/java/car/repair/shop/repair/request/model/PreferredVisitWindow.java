package car.repair.shop.repair.request.model;

import org.springframework.lang.NonNull;

import java.time.LocalDate;
import java.time.LocalTime;

record PreferredVisitWindow(@NonNull LocalDate date, LocalTime from, LocalTime to) {
}
