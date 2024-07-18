package car.repair.shop.availability;

import java.time.LocalDate;
import java.util.Objects;

public record UnavailableDateDto(String id, LocalDate date) {
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UnavailableDateDto that = (UnavailableDateDto) o;
        return Objects.equals(date, that.date);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(date);
    }
}
