import { parseLocalDay, parseUtc, toHoursAndMinutes } from './utc-date-time';

describe('utc-date-time', () => {
  it('should parse a backend UTC timestamp as UTC', () => {
    expect(parseUtc('2026-09-23T07:00:00').toISOString()).toBe('2026-09-23T07:00:00.000Z');
  });

  it('should strip fractional seconds before parsing', () => {
    expect(parseUtc('2026-09-28T16:02:37.390794').toISOString()).toBe('2026-09-28T16:02:37.000Z');
  });

  it('should convert UTC to the browser time zone', () => {
    const local = new Date(2026, 8, 23, 9, 30);
    const parsed = parseUtc(local.toISOString().slice(0, 19));

    expect(parsed.getTime()).toBe(local.getTime());
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });

  it('should parse a calendar day as that local day, without a time zone shift', () => {
    const day = parseLocalDay('2026-11-02');

    expect(day.getFullYear()).toBe(2026);
    expect(day.getMonth()).toBe(10);
    expect(day.getDate()).toBe(2);
    expect(day.getHours()).toBe(0);
  });

  it('should keep the first day of a month on that day', () => {
    expect(parseLocalDay('2026-03-01').getDate()).toBe(1);
    expect(parseLocalDay('2026-03-01').getMonth()).toBe(2);
  });

  it('should cut seconds off a wall-clock time', () => {
    expect(toHoursAndMinutes('09:00:00')).toBe('09:00');
    expect(toHoursAndMinutes('14:30')).toBe('14:30');
  });
});
