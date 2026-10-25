import {
  addDays, addMonths, fromLocalDate, toLocalDate, compareIso, daysBetween, formatPl, isoDate, isoWeekday, isValidIsoDate, isWeekend, monthOf, yearOf
} from './iso-date';

describe('iso-date', () => {
  it('builds zero-padded dates', () => {
    expect(isoDate(2026, 1, 5)).toBe('2026-01-05');
  });

  it('validates real calendar dates only', () => {
    expect(isValidIsoDate('2026-11-02')).toBeTrue();
    expect(isValidIsoDate('2026-11-31')).toBeFalse();
    expect(isValidIsoDate('2026-2-1')).toBeFalse();
    expect(isValidIsoDate('')).toBeFalse();
    expect(isValidIsoDate(null)).toBeFalse();
  });

  it('adds days across month and year ends without drift', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    // across the end of daylight saving time (25 Oct 2026 in Poland)
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('knows weekdays and weekends', () => {
    expect(isoWeekday('2026-11-02')).toBe(1); // Monday
    expect(isoWeekday('2026-11-08')).toBe(7); // Sunday
    expect(isWeekend('2026-11-14')).toBeTrue();
    expect(isWeekend('2026-11-11')).toBeFalse(); // a holiday, but the shop counts it (D5)
  });

  it('compares and measures', () => {
    expect(compareIso('2026-11-02', '2026-11-03')).toBeLessThan(0);
    expect(compareIso('2026-11-03', '2026-11-03')).toBe(0);
    expect(daysBetween('2026-12-28', '2027-01-08')).toBe(11);
    expect(yearOf('2027-01-08')).toBe(2027);
    expect(monthOf('2027-01-08')).toBe(1);
  });

  it('formats the Polish way', () => {
    expect(formatPl('2026-12-28')).toBe('28.12.2026');
  });

  it('adds calendar months, clamping to the end of the month', () => {
    expect(addMonths('2026-11-02', 1)).toBe('2026-12-02');
    expect(addMonths('2026-11-02', 3)).toBe('2027-02-02');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('converts to and from a date picker\'s local-midnight Date', () => {
    const date = toLocalDate('2026-11-10');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 10, 10, 0]);
    expect(fromLocalDate(date)).toBe('2026-11-10');
    expect(fromLocalDate(new Date(2027, 0, 1, 23, 59))).toBe('2027-01-01');
  });
});
