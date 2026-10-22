package car.repair.shop.team.controller.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * The Zespół screen. {@code today} is the backend's date - the portal uses it instead of the browser
 * clock. {@code availableYears} drives the year selector: from the earliest year with data (never later
 * than this year) through next year, the planning limit.
 */
public record EmployeeListView(LocalDate today, int year, List<Integer> availableYears, List<EmployeeView> employees) {
}
