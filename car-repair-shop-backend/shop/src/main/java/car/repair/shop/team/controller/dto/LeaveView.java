package car.repair.shop.team.controller.dto;

import java.time.LocalDate;
import java.util.SortedMap;

/** A leave with its computed working days; {@code workingDaysByYear} splits a leave over New Year. */
public record LeaveView(String id, String employeeId, LocalDate startDate, LocalDate endDate, int workingDays,
                        SortedMap<Integer, Integer> workingDaysByYear) {
}
