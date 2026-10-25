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
    INVALID_YEAR(HttpStatus.BAD_REQUEST),
    /** A new or changed medical-exam date is not after today, or more than 10 years ahead. */
    INVALID_MEDICAL_EXAM_DATE(HttpStatus.BAD_REQUEST),
    /** A new or changed BHP-training date is not after today, or more than 10 years ahead. */
    INVALID_BHP_TRAINING_DATE(HttpStatus.BAD_REQUEST),

    LEAVE_NOT_FOUND(HttpStatus.NOT_FOUND),
    /** Missing dates, end before start, or longer than the sanity limit. */
    INVALID_RANGE(HttpStatus.BAD_REQUEST),
    /** The range holds only Saturdays and Sundays. */
    NO_WORKING_DAYS(HttpStatus.UNPROCESSABLE_ENTITY),
    /** Ends after the end of next year - the planning horizon. */
    TOO_FAR_AHEAD(HttpStatus.UNPROCESSABLE_ENTITY),
    /** Overlaps another leave of the same employee (adjacent ranges are fine). */
    LEAVE_OVERLAP(HttpStatus.CONFLICT),
    /** A leave can't be moved to another employee - delete it and add a new one. */
    EMPLOYEE_CHANGE_NOT_ALLOWED(HttpStatus.BAD_REQUEST),
    /** Leave listing needs either from+to or employeeId+year. */
    INVALID_QUERY(HttpStatus.BAD_REQUEST);

    private final HttpStatus status;
}
