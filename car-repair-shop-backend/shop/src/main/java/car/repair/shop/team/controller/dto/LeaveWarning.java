package car.repair.shop.team.controller.dto;

/** A save that went through anyway (owner decision D4: overdraw only warns). Code: {@code POOL_EXCEEDED}. */
public record LeaveWarning(String code, int year, int remaining) {
    public static final String POOL_EXCEEDED = "POOL_EXCEEDED";
}
