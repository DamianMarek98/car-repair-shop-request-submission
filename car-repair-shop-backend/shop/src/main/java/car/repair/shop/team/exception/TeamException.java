package car.repair.shop.team.exception;

import lombok.Getter;

/** A rejected team request; rendered as {@code {"code": ..., "message": ...}} with the code's status. */
@Getter
public class TeamException extends RuntimeException {
    private final TeamErrorCode code;

    public TeamException(TeamErrorCode code, String message) {
        super(message);
        this.code = code;
    }
}
