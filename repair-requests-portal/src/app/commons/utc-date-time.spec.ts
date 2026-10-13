import { parseUtc, toLocalDateString, toLocalTimeString, toUtcDateTime } from './utc-date-time';

describe('utc-date-time', () => {
  it('should parse a backend UTC timestamp as UTC, with or without fractions', () => {
    expect(parseUtc('2026-09-23T07:00:00').toISOString()).toBe('2026-09-23T07:00:00.000Z');
    expect(parseUtc('2026-09-23T07:00:00.123456').toISOString()).toBe('2026-09-23T07:00:00.000Z');
  });

  it('should convert a local day and time to UTC without offset suffix', () => {
    const expected = new Date(2026, 8, 23, 9, 30).toISOString().slice(0, 19);

    expect(toUtcDateTime(new Date(2026, 8, 23), '09:30')).toBe(expected);
    expect(toUtcDateTime(new Date(2026, 8, 23), '09:30')).not.toContain('Z');
  });

  it('should round-trip local day and time through UTC', () => {
    const utc = toUtcDateTime(new Date(2026, 10, 25), '15:45');
    const parsed = parseUtc(utc);

    expect(toLocalDateString(parsed)).toBe('2026-11-25');
    expect(toLocalTimeString(parsed)).toBe('15:45');
  });
});
