import { Balance } from '../models/employee';
import { Leave } from '../models/leave';
import { addDays, IsoDate, isWeekend, yearOf } from './iso-date';

/** Monday-Friday in `[start, end]`, no holidays - the same rule as the shop's `WorkingDays`. */
export function workingDaysByYear(start: IsoDate, end: IsoDate): Map<number, number> {
  const byYear = new Map<number, number>();
  for (let day = start; day <= end; day = addDays(day, 1)) {
    if (!isWeekend(day)) {
      byYear.set(yearOf(day), (byYear.get(yearOf(day)) ?? 0) + 1);
    }
  }
  return byYear;
}

export interface YearPreview {
  year: number;
  /** working days of the new range inside this year */
  days: number;
  /** remaining in this year after the save; undefined until that year's balance is loaded */
  remainingAfter?: number;
}

export interface LeavePreview {
  workingDays: number;
  years: YearPreview[];
  /** some year would go below zero - the save still goes through (owner decision D4) */
  overPool: boolean;
}

/**
 * What saving `[start, end]` would do to the employee's pools. The backend recomputes on save and is
 * the authority; this only lets the editor see it coming.
 *
 * @param balances the employee's balance per year (as loaded - may miss a year still loading)
 * @param original the leave being edited: its days are already inside `balances`, so they are added
 *                 back before the new range is subtracted
 */
export function previewLeave(start: IsoDate, end: IsoDate, balances: Map<number, Balance>,
                             original: Leave | null = null): LeavePreview {
  const byYear = workingDaysByYear(start, end);
  const years: YearPreview[] = [];
  let workingDays = 0;
  for (const [year, days] of byYear) {
    workingDays += days;
    const balance = balances.get(year);
    const givenBack = original?.workingDaysByYear[String(year)] ?? 0;
    years.push({ year, days, remainingAfter: balance ? balance.remaining + givenBack - days : undefined });
  }
  return { workingDays, years, overPool: years.some(y => y.remainingAfter !== undefined && y.remainingAfter < 0) };
}
