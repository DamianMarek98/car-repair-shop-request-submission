package car.repair.shop.repair.request;

import car.repair.shop.repair.request.exception.RepairRequestValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppointmentTimePolicyTest {
    // Monday 2026-09-21, 10:00 UTC
    private static final LocalDateTime NOW_UTC = LocalDateTime.of(2026, 9, 21, 10, 0);

    @ParameterizedTest
    @CsvSource({
            // Wednesday 23.09.2026, summer time (UTC+2): 08:00 / 09:00 / 16:00 local
            "2026-09-23T06:00:00",
            "2026-09-23T07:00:00",
            "2026-09-23T14:00:00",
            // Wednesday 25.11.2026, winter time (UTC+1): 08:00 / 16:00 local
            "2026-11-25T07:00:00",
            "2026-11-25T15:00:00",
            // any minute is allowed
            "2026-09-23T10:37:00"
    })
    void shouldAcceptTimeWithinOpeningHoursOnWorkingDay(LocalDateTime appointmentAtUtc) {
        assertThatCode(() -> AppointmentTimePolicy.validate(appointmentAtUtc, NOW_UTC, Set.of()))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @CsvSource({
            // 07:59 and 16:01 local, summer time
            "2026-09-23T05:59:00",
            "2026-09-23T14:01:00",
            // 07:59 and 16:01 local, winter time
            "2026-11-25T06:59:00",
            "2026-11-25T15:01:00"
    })
    void shouldRejectTimeOutsideOpeningHours(LocalDateTime appointmentAtUtc) {
        assertThatThrownBy(() -> AppointmentTimePolicy.validate(appointmentAtUtc, NOW_UTC, Set.of()))
                .isInstanceOf(RepairRequestValidationException.class)
                .hasMessageContaining("08:00 and 16:00");
    }

    @Test
    void shouldRejectWeekend() {
        // Saturday 26.09.2026, 10:00 local
        assertThatThrownBy(() -> AppointmentTimePolicy.validate(LocalDateTime.of(2026, 9, 26, 8, 0), NOW_UTC, Set.of()))
                .isInstanceOf(RepairRequestValidationException.class)
                .hasMessageContaining("weekend");
    }

    @Test
    void shouldCheckWeekendInShopTimeNotUtc() {
        // 25.09.2026 23:30 UTC is Saturday 01:30 in Warsaw - rejected as weekend, not as a Friday
        assertThatThrownBy(() -> AppointmentTimePolicy.validate(LocalDateTime.of(2026, 9, 25, 23, 30), NOW_UTC, Set.of()))
                .isInstanceOf(RepairRequestValidationException.class)
                .hasMessageContaining("weekend");
    }

    @Test
    void shouldRejectUnavailableDay() {
        var unavailable = Set.of(LocalDate.of(2026, 9, 23));

        assertThatThrownBy(() -> AppointmentTimePolicy.validate(LocalDateTime.of(2026, 9, 23, 7, 0), NOW_UTC, unavailable))
                .isInstanceOf(RepairRequestValidationException.class)
                .hasMessageContaining("unavailable");
    }

    @Test
    void shouldRejectPastTime() {
        assertThatThrownBy(() -> AppointmentTimePolicy.validate(NOW_UTC.minusHours(1), NOW_UTC, Set.of()))
                .isInstanceOf(RepairRequestValidationException.class)
                .hasMessageContaining("future");
    }

    @Test
    void shouldRejectMissingTime() {
        assertThatThrownBy(() -> AppointmentTimePolicy.validate(null, NOW_UTC, Set.of()))
                .isInstanceOf(RepairRequestValidationException.class)
                .hasMessageContaining("required");
    }
}
