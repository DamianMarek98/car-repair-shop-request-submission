package car.repair.shop.repair.request.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(code = HttpStatus.BAD_REQUEST)
public class RepairRequestValidationException extends RuntimeException {
    public RepairRequestValidationException(String message) {
        super(message);
    }
}
