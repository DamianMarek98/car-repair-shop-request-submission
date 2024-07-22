package car.repair.shop.repair.request.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.BAD_REQUEST, reason = "Rodo has to be accepted")
public class RepairRequestRodoException extends RuntimeException {
}
