package car.repair.shop.availability;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.BAD_REQUEST, reason = "Date cannot be past")
class PastDateException extends RuntimeException {
}
