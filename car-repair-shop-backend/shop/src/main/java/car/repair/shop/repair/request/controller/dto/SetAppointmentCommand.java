package car.repair.shop.repair.request.controller.dto;

import java.time.LocalDateTime;

/**
 * Body of the "Umów wizytę" / "Zmień termin" action.
 *
 * @param appointmentAt visit time in UTC without offset (e.g. {@code 2026-09-23T07:00:00} for 09:00
 *                      in Warsaw), the same convention as {@code submittedAt}. Required.
 */
public record SetAppointmentCommand(LocalDateTime appointmentAt) {
}
