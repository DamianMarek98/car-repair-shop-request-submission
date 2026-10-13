/**
 * Every backend timestamp (`submittedAt`, `appointmentAt`, `completedAt`, ...) is a UTC
 * LocalDateTime without offset, e.g. `2026-09-23T07:00:00` or `2026-09-23T07:00:00.123456`.
 * The portal shows them in the browser's time zone.
 *
 * Preferred visit windows are different: their `date` is a local calendar day and their times
 * are local wall-clock values - they must never be shifted by a time zone.
 */

/** Parses a backend UTC timestamp into a Date (an absolute instant). */
export function parseUtc(datetime: string): Date {
  return new Date(datetime.replace(/\.\d+/, '') + 'Z');
}

/** Parses a `YYYY-MM-DD` calendar day as local midnight (`new Date('YYYY-MM-DD')` would be UTC). */
export function parseLocalDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** `HH:mm` of a local wall-clock time such as `09:00:00`. */
export function toHoursAndMinutes(time: string): string {
  return time.slice(0, 5);
}
