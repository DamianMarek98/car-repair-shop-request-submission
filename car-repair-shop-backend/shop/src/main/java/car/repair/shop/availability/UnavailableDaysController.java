package car.repair.shop.availability;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Set;

@RestController
@RequestMapping("/api/internal/unavailable-day")
@RequiredArgsConstructor
public class UnavailableDaysController {
    private final UnavailableDayFacade unavailableDayFacade;

    @GetMapping
    @CrossOrigin(origins = "http://localhost:4201")
    public ResponseEntity<Set<UnavailableDateDto>> getALl() {
        var unavailableDays = unavailableDayFacade.getAllUnavailableDays();
        return ResponseEntity.ok(unavailableDays);
    }

    @DeleteMapping("/{id}")
    @CrossOrigin(origins = "http://localhost:4201")
    @ResponseStatus(code = HttpStatus.OK)
    public void getALl(@PathVariable String id) {
        unavailableDayFacade.removeUnavailableDay(id);
    }

    @PostMapping
    @CrossOrigin(origins = "http://localhost:4201")
    @ResponseStatus(code = HttpStatus.OK)
    public UnavailableDateDto addUnavailableDate(@RequestBody UnavailableDayAddRequest unavailableDayAddRequest) {
        return unavailableDayFacade.addUnavailableDay(unavailableDayAddRequest.date);
    }

    public record UnavailableDayAddRequest(LocalDate date) {
    }
}
