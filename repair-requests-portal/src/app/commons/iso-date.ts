/**
 * Calendar-date helpers on 'YYYY-MM-DD' strings, the format the team API uses for leave dates.
 *
 * Never use `new Date('2026-11-02')` for these: it parses as UTC midnight and shows as the previous
 * day west of UTC. Arithmetic here runs on UTC timestamps only, so DST and the browser's time zone
 * can't shift a date.
 */
export type IsoDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;

export const POLISH_MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec',
  'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
export const POLISH_MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź',
  'lis', 'gru'];

function toUtcMs(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): IsoDate {
  const d = new Date(ms);
  return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Builds 'YYYY-MM-DD' from parts; month is 1-12. */
export function isoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isValidIsoDate(value: string | null | undefined): value is IsoDate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return fromUtcMs(toUtcMs(value)) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** 1 = Monday … 7 = Sunday (ISO weekday). */
export function isoWeekday(date: IsoDate): number {
  const day = new Date(toUtcMs(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isWeekend(date: IsoDate): boolean {
  return isoWeekday(date) >= 6;
}

/** Negative, zero or positive like a comparator - ISO strings compare correctly as text. */
export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

/** 1-12 */
export function monthOf(date: IsoDate): number {
  return Number(date.slice(5, 7));
}

/** Days from `from` to `to` (0 when equal, negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** '2026-12-28' → '28.12.2026' */
export function formatPl(date: IsoDate): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`;
}

/** Calendar months, clamped to the end of the month: '2026-01-31' + 1 → '2026-02-28'. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number);
  const monthIndex = (month - 1) + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12 + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return isoDate(targetYear, targetMonth, Math.min(day, lastDay));
}

/** Local-midnight `Date` for a date picker. `new Date('YYYY-MM-DD')` would be UTC midnight instead. */
export function toLocalDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The calendar day a date picker's local `Date` stands for. */
export function fromLocalDate(date: Date): IsoDate {
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
