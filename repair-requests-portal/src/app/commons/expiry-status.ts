import { daysLabel } from './days-label';
import { addDays, addMonths, daysBetween, IsoDate } from './iso-date';

/** Red when less than this many months are left (spec/05-team-medical-and-bhp-dates-plan.md §3.2). */
export const URGENT_MONTHS = 1;
/** Yellow when less than this many months are left. */
export const SOON_MONTHS = 3;
/** Mirrors shop `TeamFacade.MAX_EXPIRY_YEARS_AHEAD`. */
export const MAX_EXPIRY_YEARS_AHEAD = 10;

export type ExpiryStatus = 'MISSING' | 'EXPIRED' | 'URGENT' | 'SOON' | 'OK';

export interface Expiry {
  status: ExpiryStatus;
  /** colour: none = plain/grey, warning = yellow, danger = red */
  level: 'none' | 'warning' | 'danger';
  /** short line under the date in the table; empty when there's nothing to say */
  note: string;
  /** line under the date field in the editor */
  hint: string;
}

/**
 * Expiry state of a "valid until" date (the last valid day, inclusive) on `today` - always the
 * backend's today, never the browser clock.
 */
export function expiryOf(validUntil: IsoDate | null | undefined, today: IsoDate): Expiry {
  if (!validUntil) {
    return { status: 'MISSING', level: 'none', note: '', hint: 'Brak daty' };
  }
  const days = daysBetween(today, validUntil);
  if (days < 0) {
    const ago = `${daysLabel(-days)} temu`;
    return { status: 'EXPIRED', level: 'danger', note: `wygasło ${ago}`, hint: `Wygasło ${ago}` };
  }
  const note = days === 0 ? 'wygasa dziś' : `za ${daysLabel(days)}`;
  const hint = days === 0 ? 'Wygasa dziś' : `Wygasa za ${daysLabel(days)}`;
  if (validUntil < addMonths(today, URGENT_MONTHS)) {
    return { status: 'URGENT', level: 'danger', note, hint };
  }
  if (validUntil < addMonths(today, SOON_MONTHS)) {
    return { status: 'SOON', level: 'warning', note, hint };
  }
  return { status: 'OK', level: 'none', note: '', hint: 'Ważne' };
}

/** Earliest date that can be typed: tomorrow (owner decision E3). */
export function earliestExpiryDate(today: IsoDate): IsoDate {
  return addDays(today, 1);
}

export function latestExpiryDate(today: IsoDate): IsoDate {
  return addMonths(today, MAX_EXPIRY_YEARS_AHEAD * 12);
}

/**
 * Same rule as the backend: a new or changed date must be after today and at most 10 years ahead;
 * an unchanged (even expired) date and "no date" are always fine.
 */
export function isExpiryDateAllowed(value: IsoDate | null, stored: IsoDate | null, today: IsoDate): boolean {
  if (!value || value === stored) {
    return true;
  }
  return value >= earliestExpiryDate(today) && value <= latestExpiryDate(today);
}
