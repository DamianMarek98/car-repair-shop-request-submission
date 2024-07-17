package car.repair.shop.availability;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;

@Slf4j
@Component
@RequiredArgsConstructor
public class PastUnavailableDaysCleaner {
    private final UnavailableDayRepository unavailableDayRepository;

    @Scheduled(cron = "0 0 0 * * SUN")
    public void cleanupPastUnavailableDays() {
        log.info("cleanup past unavailable days");
        var today = LocalDate.now();
        var unavailableDaysToDelete = new ArrayList<UnavailableDay>();
        unavailableDayRepository.findAll()
                .forEach(unavailableDay -> {
                    if (unavailableDay.getDate().isBefore(today)) {
                        unavailableDaysToDelete.add(unavailableDay);
                    }
                });
        unavailableDayRepository.deleteAll(unavailableDaysToDelete);
        log.info("deleted {} unavailable days", unavailableDaysToDelete.size());
    }
}
