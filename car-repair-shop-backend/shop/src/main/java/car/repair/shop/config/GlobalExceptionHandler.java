package car.repair.shop.config;

import car.repair.shop.auth.UnauthorizedException;
import car.repair.shop.commons.exceptions.EntityNotFoundException;
import car.repair.shop.repair.request.exception.RepairRequestMissingCarInformationException;
import car.repair.shop.repair.request.exception.RepairRequestRodoException;
import car.repair.shop.repair.request.exception.RepairRequestStateException;
import car.repair.shop.repair.request.exception.RepairRequestValidationException;
import car.repair.shop.team.exception.TeamException;
import jakarta.validation.ValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<String> handleUnauthorizedException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized access");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGenericException(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleEntityNotFoundException(EntityNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Entity not found");
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<String> handleConstraintViolationException(ValidationException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<String> handleHttpMessageNotReadableException() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Malformed request body");
    }

    @ExceptionHandler(RepairRequestStateException.class)
    public ResponseEntity<String> handleRepairRequestStateException(RepairRequestStateException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
    }

    @ExceptionHandler(RepairRequestValidationException.class)
    public ResponseEntity<String> handleRepairRequestValidationException(RepairRequestValidationException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(RepairRequestMissingCarInformationException.class)
    public ResponseEntity<String> handleRepairRequestMissingCarInformationException(RepairRequestMissingCarInformationException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(RepairRequestRodoException.class)
    public ResponseEntity<String> handleRepairRequestRodoException(RepairRequestRodoException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(TeamException.class)
    public ResponseEntity<TeamErrorResponse> handleTeamException(TeamException e) {
        return ResponseEntity.status(e.getCode().getStatus()).body(new TeamErrorResponse(e.getCode().name(), e.getMessage()));
    }

    public record TeamErrorResponse(String code, String message) {
    }
}
