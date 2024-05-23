package car.repair.shop.repair.request;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(code = HttpStatus.FORBIDDEN)
public class RepairRequestStateException extends RuntimeException {
    public RepairRequestStateException(String message) {
        super(message);
    }
}
