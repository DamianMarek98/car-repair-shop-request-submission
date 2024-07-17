package car.repair.shop.availability;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UnavailableDayFacade {
    private final UnavailableDayRepository unavailableDayRepository;

    public UnavailableDateDto addUnavailableDay(LocalDate date) {
        if (date.isBefore(LocalDate.now())) {
            throw new PastDateException();
        }

        var unavailableDay = new UnavailableDay();
        unavailableDay.setDate(date);
        unavailableDay = unavailableDayRepository.save(unavailableDay);
        return new UnavailableDateDto(unavailableDay.getId(), unavailableDay.getDate());
    }

    public void removeUnavailableDay(String id) {
        unavailableDayRepository.deleteById(id);
    }

    public Set<UnavailableDateDto> getAllUnavailableDays() {
        var unavailableDays = new HashSet<UnavailableDateDto>();
        unavailableDayRepository.findAll()
                .forEach(unavailableDay -> unavailableDays.add(new UnavailableDateDto(unavailableDay.getId(), unavailableDay.getDate())));
        return unavailableDays;
    }

}
