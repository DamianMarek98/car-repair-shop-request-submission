package car.repair.shop.repair.request;

import car.repair.shop.repair.request.exception.RepairRequestValidationException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Set;

/**
 * Rules for a visit time set by the workshop. The time arrives and is stored in UTC, but every
 * rule here (weekend, unavailable day, opening hours) is about the shop's local calendar, so it
 * is checked in {@link #SHOP_ZONE}.
 */
final class AppointmentTimePolicy {
    static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Warsaw");
    static final LocalTime OPENS_AT = LocalTime.of(8, 0);
    static final LocalTime CLOSES_AT = LocalTime.of(16, 0);

    private AppointmentTimePolicy() {
    }

    static void validate(LocalDateTime appointmentAtUtc, LocalDateTime nowUtc, Set<LocalDate> unavailableDays) {
        if (appointmentAtUtc == null) {
            throw new RepairRequestValidationException("Appointment time is required");
        }
        if (!appointmentAtUtc.isAfter(nowUtc)) {
            throw new RepairRequestValidationException("Appointment time must be in the future");
        }

        var local = toShopTime(appointmentAtUtc);
        var day = local.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            throw new RepairRequestValidationException("Appointment cannot be on a weekend");
        }
        if (unavailableDays.contains(local.toLocalDate())) {
            throw new RepairRequestValidationException("Appointment cannot be on an unavailable day");
        }
        var time = local.toLocalTime();
        if (time.isBefore(OPENS_AT) || time.isAfter(CLOSES_AT)) {
            throw new RepairRequestValidationException("Appointment must be between 08:00 and 16:00");
        }
    }

    static LocalDateTime toShopTime(LocalDateTime utc) {
        return utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(SHOP_ZONE).toLocalDateTime();
    }
}
