package car.repair.shop.team;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Working-day arithmetic for leave: Monday-Friday, both ends inclusive. The shop knows no public
 * holidays on purpose (owner decision D5) - 11 November on a Wednesday is a working day here.
 */
final class WorkingDays {
    private WorkingDays() {
    }

    static boolean isWorkingDay(LocalDate date) {
        var day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
    }

    /** Working days in {@code [from, to]}; 0 when {@code from} is after {@code to}. */
    static int count(LocalDate from, LocalDate to) {
        int count = 0;
        for (var day = from; !day.isAfter(to); day = day.plusDays(1)) {
            if (isWorkingDay(day)) {
                count++;
            }
        }
        return count;
    }

    /** Working days of {@code [from, to]} that fall inside calendar year {@code year}. */
    static int countInYear(LocalDate from, LocalDate to, int year) {
        return count(max(from, LocalDate.of(year, 1, 1)), min(to, LocalDate.of(year, 12, 31)));
    }

    /** Working days per calendar year; years without a working day are left out. */
    static SortedMap<Integer, Integer> countByYear(LocalDate from, LocalDate to) {
        var byYear = new TreeMap<Integer, Integer>();
        for (int year = from.getYear(); year <= to.getYear(); year++) {
            int days = countInYear(from, to, year);
            if (days > 0) {
                byYear.put(year, days);
            }
        }
        return byYear;
    }

    /** Working days per month of {@code year}, index 0 = January. */
    static int[] countByMonth(LocalDate from, LocalDate to, int year) {
        var months = new int[12];
        for (int month = 1; month <= 12; month++) {
            var monthStart = LocalDate.of(year, month, 1);
            var monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
            months[month - 1] = count(max(from, monthStart), min(to, monthEnd));
        }
        return months;
    }

    static LocalDate max(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }

    static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }
}
