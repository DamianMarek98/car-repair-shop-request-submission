import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

/**
 * Material's native date adapter with Polish input: typed dates are read as dd.mm.rrrr (the stock
 * adapter uses `Date.parse`, which reads "10.11.2026" US-style as 11 October), and weeks start on
 * Monday. Month and day names come from the `pl-PL` locale (`MAT_DATE_LOCALE`).
 */
@Injectable()
export class PlDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }

  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') {
      return super.parse(value, parseFormat);
    }
    const text = value.trim();
    if (!text) {
      return null;
    }
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
    if (!match) {
      return this.invalid();
    }
    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);
    // rejects 31.02.2027 and the like, which Date would roll over into March
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : this.invalid();
  }
}

/** The input shows "01.12.2026" (zero-padded, as in the Zespół table); the calendar uses Polish names. */
export const PL_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null },
  display: {
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
    monthYearLabel: { year: 'numeric', month: 'long' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
