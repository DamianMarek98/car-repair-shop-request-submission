package car.repair.shop.availability;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.CONFLICT)
public class DuplicatedUnavailableDayException extends RuntimeException {
}
