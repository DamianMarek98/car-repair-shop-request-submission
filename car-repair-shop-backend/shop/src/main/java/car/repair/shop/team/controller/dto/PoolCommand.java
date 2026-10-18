package car.repair.shop.team.controller.dto;

/** Hand-typed pool for one year; {@code null} removes it, so the year falls back to the default. */
public record PoolCommand(Integer days) {
}
