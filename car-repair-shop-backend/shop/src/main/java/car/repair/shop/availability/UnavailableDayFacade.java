package car.repair.shop.availability;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class UnavailableDayFacade {
    private final UnavailableDayRepository unavailableDayRepository;

    public UnavailableDateDto addUnavailableDay(LocalDate date) {
        if (date.isBefore(LocalDate.now())) {
            throw new PastDateException();
        }

        if (getAllUnavailableDays().contains(new UnavailableDateDto("", date))) {
            throw new DuplicatedUnavailableDayException();
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

    @Transactional
    public void clearUnavailableDays() {
        var unavailableDays = unavailableDayRepository.findAll();
        unavailableDays.forEach(day -> {
            unavailableDayRepository.deleteById(day.getId()); // Use deleteById to ensure proper deletion in lambda environment
            log.info("Deleted day with ID: {}", day.getId());
        });
        log.info("Deleted all unavailable days");
    }
}
