package car.repair.shop.repair.request.controller.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record PreferredVisitWindowDto(LocalDate date,
                                      LocalTime from,
                                      LocalTime to) {
}
