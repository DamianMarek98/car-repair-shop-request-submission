package car.repair.shop.availability;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.*;

class PastUnavailableDaysCleanerTest {
    private final UnavailableDayRepository unavailableDayRepositoryMock = mock(UnavailableDayRepository.class);

    private final PastUnavailableDaysCleaner pastUnavailableDaysCleaner = new PastUnavailableDaysCleaner(unavailableDayRepositoryMock);

    @Test
    void shouldDeleteAllPastDates() {
        var today = new UnavailableDay();
        today.setDate(LocalDate.now());
        var yesterday = new UnavailableDay();
        yesterday.setDate(today.date.minusDays(1));
        var twoDaysAgo = new UnavailableDay();
        twoDaysAgo.setDate(today.date.minusDays(2));
        var tomorrow = new UnavailableDay();
        tomorrow.setDate(today.date.plusDays(1));
        when(unavailableDayRepositoryMock.findAll()).thenReturn(List.of(twoDaysAgo, yesterday, today, tomorrow));

        pastUnavailableDaysCleaner.cleanupPastUnavailableDays();

        verify(unavailableDayRepositoryMock).deleteAll(List.of(twoDaysAgo, yesterday));
    }
}
