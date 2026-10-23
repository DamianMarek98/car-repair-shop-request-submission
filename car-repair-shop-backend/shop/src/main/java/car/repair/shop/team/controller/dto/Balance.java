package car.repair.shop.team.controller.dto;

/**
 * One employee's leave pool for one calendar year. {@code taken} = working days before today,
 * {@code planned} = today and later; {@code remaining} may be negative (overdraw only warns).
 */
public record Balance(int year, int pool, boolean poolIsDefault, int taken, int planned, int remaining) {
}
