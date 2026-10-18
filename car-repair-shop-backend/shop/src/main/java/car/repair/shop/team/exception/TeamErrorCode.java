package car.repair.shop.team.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/** Error codes of the team API. The admin portal maps each code to Polish copy - keep them stable. */
@Getter
@RequiredArgsConstructor
public enum TeamErrorCode {
    EMPLOYEE_NOT_FOUND(HttpStatus.NOT_FOUND),
    INVALID_NAME(HttpStatus.BAD_REQUEST),
    INVALID_POOL(HttpStatus.BAD_REQUEST),
    INVALID_YEAR(HttpStatus.BAD_REQUEST);

    private final HttpStatus status;
}
