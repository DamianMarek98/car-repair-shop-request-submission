package car.repair.shop.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * The shop's clock. Code that needs "today" takes this bean instead of calling
 * {@code LocalDate.now()}, so tests and local runs can pin the date.
 */
@Slf4j
@Configuration
public class ClockConfig {
    public static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Warsaw");

    @Bean
    @Profile("!local")
    public Clock clock() {
        return Clock.system(SHOP_ZONE);
    }

    /**
     * Local runs only: {@code car.repair.shop.clock.fixed-date=2026-11-02} (or env
     * {@code CAR_REPAIR_SHOP_CLOCK_FIXEDDATE}) starts the clock at midnight of that date. Time still
     * moves, so timestamps stay distinct. Ignored in every other profile.
     */
    @Bean
    @Profile("local")
    public Clock localClock(@Value("${car.repair.shop.clock.fixed-date:}") String fixedDate) {
        var systemClock = Clock.system(SHOP_ZONE);
        if (fixedDate.isBlank()) {
            return systemClock;
        }
        var start = LocalDate.parse(fixedDate).atStartOfDay(SHOP_ZONE).toInstant();
        log.warn("Clock pinned to {} (car.repair.shop.clock.fixed-date) - local profile only", fixedDate);
        return Clock.offset(systemClock, Duration.between(systemClock.instant(), start));
    }
}
