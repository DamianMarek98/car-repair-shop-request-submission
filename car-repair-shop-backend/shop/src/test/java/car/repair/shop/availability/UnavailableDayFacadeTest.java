package car.repair.shop.availability;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UnavailableDayFacadeTest {
    private final UnavailableDayRepository unavailableDayRepositoryMock = mock(UnavailableDayRepository.class);

    private final UnavailableDayFacade unavailableDayFacade = new UnavailableDayFacade(unavailableDayRepositoryMock);

    @Test
    void givenPastDate_addUnavailableDay_shouldThrowPastDateException() {
        LocalDate pastDate = LocalDate.now().minusDays(1);
        assertThrows(PastDateException.class, () -> unavailableDayFacade.addUnavailableDay(pastDate));
    }

    @Test
    void givenFutureDate_addUnavailableDay_shouldReturnDto() {
        UnavailableDay unavailableDay = new UnavailableDay();
        unavailableDay.setDate(LocalDate.now().plusDays(1));
        unavailableDay.setId("id");
        when(unavailableDayRepositoryMock.save(any())).thenReturn(unavailableDay);

        var result = unavailableDayFacade.addUnavailableDay(unavailableDay.getDate());
        assertThat(result.date()).isEqualTo(unavailableDay.getDate());
        assertThat(result.id()).isEqualTo(unavailableDay.getId());
    }

    @Test
    void getAllUnavailableDays_shouldReturnAllUnavailableDaysAsDtos() {
        UnavailableDay unavailableDay1 = new UnavailableDay();
        unavailableDay1.setDate(LocalDate.now().plusDays(1));
        unavailableDay1.setId("id1");
        UnavailableDay unavailableDay2 = new UnavailableDay();
        unavailableDay1.setDate(LocalDate.now().plusDays(2));
        unavailableDay1.setId("id2");
        when(unavailableDayRepositoryMock.findAll()).thenReturn(List.of(unavailableDay1, unavailableDay2));

        var result = unavailableDayFacade.getAllUnavailableDays();

        assertTrue(result.containsAll(List.of(new UnavailableDateDto(unavailableDay1.getId(), unavailableDay1.getDate()),
                new UnavailableDateDto(unavailableDay2.getId(), unavailableDay2.getDate()))));
    }
}
