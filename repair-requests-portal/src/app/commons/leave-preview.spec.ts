import { previewLeave, workingDaysByYear } from './leave-preview';
import { Balance } from '../models/employee';
import { Leave } from '../models/leave';

describe('leave-preview', () => {
  function balance(year: number, pool: number, used: number): Balance {
    return { year, pool, poolIsDefault: false, taken: 0, planned: used, remaining: pool - used };
  }

  it('counts Monday-Friday only, holidays included', () => {
    expect(workingDaysByYear('2026-11-09', '2026-11-13')).toEqual(new Map([[2026, 5]])); // with 11 Nov
    expect(workingDaysByYear('2026-11-14', '2026-11-15')).toEqual(new Map());
  });

  it('splits a leave over New Year', () => {
    expect(workingDaysByYear('2026-12-28', '2027-01-08')).toEqual(new Map([[2026, 4], [2027, 6]]));
  });

  it('shows remaining after the save per year', () => {
    const balances = new Map([[2026, balance(2026, 9, 4)], [2027, balance(2027, 30, 0)]]);

    const preview = previewLeave('2026-12-28', '2027-01-08', balances);

    expect(preview.workingDays).toBe(10);
    expect(preview.years).toEqual([
      { year: 2026, days: 4, remainingAfter: 1 },
      { year: 2027, days: 6, remainingAfter: 24 },
    ]);
    expect(preview.overPool).toBeFalse();
  });

  it('flags an overdraw and keeps the negative remaining', () => {
    const preview = previewLeave('2026-11-23', '2026-11-24', new Map([[2026, balance(2026, 3, 5)]]));

    expect(preview.years[0].remainingAfter).toBe(-4);
    expect(preview.overPool).toBeTrue();
  });

  it('editing a 5-day leave down to 2 days gives 3 days back', () => {
    const original: Leave = {
      id: 'l', employeeId: 'e', startDate: '2026-11-09', endDate: '2026-11-13', workingDays: 5,
      workingDaysByYear: { '2026': 5 },
    };
    // the stored balance already contains the original 5 days: 26 - 5 = 21
    const balances = new Map([[2026, balance(2026, 26, 5)]]);

    const preview = previewLeave('2026-11-09', '2026-11-10', balances, original);

    expect(preview.years[0].remainingAfter).toBe(24);
  });

  it('leaves remaining undefined while a year is not loaded yet', () => {
    const preview = previewLeave('2026-12-28', '2027-01-08', new Map([[2026, balance(2026, 9, 4)]]));

    expect(preview.years[1].remainingAfter).toBeUndefined();
    expect(preview.overPool).toBeFalse();
  });
});
