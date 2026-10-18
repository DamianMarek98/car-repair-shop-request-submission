import { Leave } from '../models/leave';
import { addDays, compareIso, isoDate, isoWeekday, IsoDate, isWeekend, monthOf } from './iso-date';

/** Bars shown per day before the rest collapses into "+N więcej" (as in the design). */
export const MAX_LANES = 3;

/** One leave's piece inside one day cell. */
export interface CalendarSlot {
  leave: Leave;
  /** the name goes at the bar's start and again at the start of each week */
  showLabel: boolean;
  /** the bar continues into the previous / next cell of the same week (square edge on that side) */
  continuesLeft: boolean;
  continuesRight: boolean;
}

export interface CalendarDay {
  date: IsoDate;
  dayOfMonth: number;
  inMonth: boolean;
  weekend: boolean;
  today: boolean;
  /** one entry per lane of the week; null keeps lanes aligned across the row */
  slots: (CalendarSlot | null)[];
  /** leave on this day that didn't fit into MAX_LANES */
  more: number;
}

export interface CalendarWeek {
  days: CalendarDay[];
}

/** The visible grid of a month: Monday before (or on) the 1st through the Sunday after (or on) the last. */
export function monthGridRange(year: number, month: number): { start: IsoDate; end: IsoDate; weeks: number } {
  const first = isoDate(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = isoWeekday(first) - 1;
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const start = addDays(first, -offset);
  return { start, end: addDays(start, weeks * 7 - 1), weeks };
}

/**
 * Lays leave out week by week. Within a week, leave is sorted by start (then employee, then id, so
 * the layout is stable) and each takes the first lane that is free - a lane is free when its last
 * leave ended before this one starts, so back-to-back leave shares a lane.
 */
export function layoutMonth(year: number, month: number, leaves: Leave[], today: IsoDate): CalendarWeek[] {
  const grid = monthGridRange(year, month);
  const weeks: CalendarWeek[] = [];

  for (let week = 0; week < grid.weeks; week++) {
    const weekStart = addDays(grid.start, week * 7);
    const weekEnd = addDays(weekStart, 6);
    const inWeek = leaves
      .filter(leave => leave.startDate <= weekEnd && leave.endDate >= weekStart)
      .sort((a, b) => compareIso(a.startDate, b.startDate)
        || a.employeeId.localeCompare(b.employeeId)
        || a.id.localeCompare(b.id));

    const laneEnds: IsoDate[] = [];
    const laneOf = new Map<string, number>();
    for (const leave of inWeek) {
      let lane = laneEnds.findIndex(end => end < leave.startDate);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(leave.endDate);
      } else {
        laneEnds[lane] = leave.endDate;
      }
      laneOf.set(leave.id, lane);
    }
    const visibleLanes = Math.min(laneEnds.length, MAX_LANES);

    const days: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const date = addDays(weekStart, weekday);
      const slots: (CalendarSlot | null)[] = new Array(visibleLanes).fill(null);
      let more = 0;
      for (const leave of inWeek) {
        if (leave.startDate > date || leave.endDate < date) {
          continue;
        }
        const lane = laneOf.get(leave.id)!;
        if (lane >= MAX_LANES) {
          more++;
          continue;
        }
        slots[lane] = {
          leave,
          showLabel: leave.startDate === date || weekday === 0,
          continuesLeft: leave.startDate < date && weekday > 0,
          continuesRight: leave.endDate > date && weekday < 6,
        };
      }
      days.push({
        date,
        dayOfMonth: Number(date.slice(8, 10)),
        inMonth: monthOf(date) === month,
        weekend: isWeekend(date),
        today: date === today,
        slots,
        more,
      });
    }
    weeks.push({ days });
  }
  return weeks;
}
