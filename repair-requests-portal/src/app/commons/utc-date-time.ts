/**
 * Every backend timestamp (`submittedAt`, `handledAt`, `appointmentAt`, ...) is a UTC
 * LocalDateTime without offset, e.g. `2026-09-23T07:00:00` or `2026-09-23T07:00:00.123456`.
 * The portal converts to the browser's time zone for display and back to UTC when sending.
 */

/** Parses a backend UTC timestamp into a Date (an absolute instant). */
export function parseUtc(datetime: string): Date {
  return new Date(datetime.replace(/\.\d+/, '') + 'Z');
}

/** Combines a local calendar day and a local `HH:mm` time into the backend's UTC format. */
export function toUtcDateTime(localDate: Date, localTime: string): string {
  const [hours, minutes] = localTime.split(':').map(Number);
  const local = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), hours, minutes);
  return local.toISOString().slice(0, 19);
}

/** `YYYY-MM-DD` of a local calendar day — the format of unavailable days. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local `HH:mm` of an instant. */
export function toLocalTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
