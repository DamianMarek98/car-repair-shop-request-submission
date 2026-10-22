import { layoutMonth, MAX_LANES, monthGridRange } from './calendar-layout';
import { Leave } from '../models/leave';

describe('calendar-layout', () => {
  function leave(id: string, employeeId: string, startDate: string, endDate: string): Leave {
    return { id, employeeId, startDate, endDate, workingDays: 0, workingDaysByYear: {} };
  }

  function day(weeks: ReturnType<typeof layoutMonth>, date: string) {
    return weeks.flatMap(w => w.days).find(d => d.date === date)!;
  }

  it('November 2026 has 6 weeks, Mon 26 Oct - Sun 6 Dec', () => {
    const grid = monthGridRange(2026, 11);
    const weeks = layoutMonth(2026, 11, [], '2026-11-02');

    expect(grid).toEqual({ start: '2026-10-26', end: '2026-12-06', weeks: 6 });
    expect(weeks.length).toBe(6);
    expect(weeks[0].days[0].date).toBe('2026-10-26');
    expect(weeks[5].days[6].date).toBe('2026-12-06');
    expect(day(weeks, '2026-10-26').inMonth).toBeFalse();
    expect(day(weeks, '2026-11-01').inMonth).toBeTrue();
  });

  it('a month starting on Monday needs no leading days', () => {
    // June 2026 starts on a Monday
    expect(monthGridRange(2026, 6)).toEqual({ start: '2026-06-01', end: '2026-07-05', weeks: 5 });
  });

  it('flags today and weekends', () => {
    const weeks = layoutMonth(2026, 11, [], '2026-11-02');

    expect(day(weeks, '2026-11-02').today).toBeTrue();
    expect(day(weeks, '2026-11-03').today).toBeFalse();
    expect(day(weeks, '2026-11-07').weekend).toBeTrue();
    expect(day(weeks, '2026-11-06').weekend).toBeFalse();
  });

  it('a Thu-Tue leave spans two weeks, labelled at its start and at the next Monday', () => {
    const weeks = layoutMonth(2026, 11, [leave('a', 'e1', '2026-11-12', '2026-11-17')], '2026-11-02');

    const thursday = day(weeks, '2026-11-12').slots[0]!;
    const friday = day(weeks, '2026-11-13').slots[0]!;
    const sunday = day(weeks, '2026-11-15').slots[0]!;
    const monday = day(weeks, '2026-11-16').slots[0]!;
    const tuesday = day(weeks, '2026-11-17').slots[0]!;

    expect(thursday.showLabel).toBeTrue();
    expect(thursday.continuesLeft).toBeFalse();
    expect(friday.showLabel).toBeFalse();
    expect(sunday.continuesRight).toBeFalse(); // the week ends - the bar breaks
    expect(monday.showLabel).toBeTrue();       // repeated at the start of the next week
    expect(monday.continuesLeft).toBeFalse();
    expect(tuesday.continuesRight).toBeFalse();
    // the week still has one lane (used 16-17 Nov), so the 18th keeps an empty slot for alignment
    expect(day(weeks, '2026-11-18').slots).toEqual([null]);
    expect(day(weeks, '2026-11-23').slots).toEqual([]);
  });

  it('four overlapping leaves give 3 lanes and "+1" on each covered day', () => {
    const leaves = ['e1', 'e2', 'e3', 'e4'].map((e, i) => leave('l' + i, e, '2026-11-16', '2026-11-20'));
    const weeks = layoutMonth(2026, 11, leaves, '2026-11-02');

    for (const date of ['2026-11-16', '2026-11-18', '2026-11-20']) {
      expect(day(weeks, date).slots.length).withContext(date).toBe(MAX_LANES);
      expect(day(weeks, date).more).withContext(date).toBe(1);
    }
    expect(day(weeks, '2026-11-21').more).toBe(0);
  });

  it('back-to-back leaves share one lane', () => {
    const leaves = [leave('a', 'e1', '2026-11-16', '2026-11-18'), leave('b', 'e1', '2026-11-19', '2026-11-20')];
    const weeks = layoutMonth(2026, 11, leaves, '2026-11-02');

    expect(day(weeks, '2026-11-16').slots.length).toBe(1);
    expect(day(weeks, '2026-11-18').slots[0]!.leave.id).toBe('a');
    expect(day(weeks, '2026-11-19').slots[0]!.leave.id).toBe('b');
    expect(day(weeks, '2026-11-19').slots[0]!.showLabel).toBeTrue();
  });

  it('keeps lanes aligned: a day without leave in a lane gets null', () => {
    const leaves = [leave('a', 'e1', '2026-11-16', '2026-11-20'), leave('b', 'e2', '2026-11-18', '2026-11-18')];
    const weeks = layoutMonth(2026, 11, leaves, '2026-11-02');

    expect(day(weeks, '2026-11-16').slots.length).toBe(2);
    expect(day(weeks, '2026-11-16').slots[1]).toBeNull();
    expect(day(weeks, '2026-11-18').slots[1]!.leave.id).toBe('b');
  });

  it('renders a leave across the year boundary in both months', () => {
    const newYear = [leave('ny', 'e1', '2026-12-28', '2027-01-08')];

    const december = layoutMonth(2026, 12, newYear, '2026-11-02');
    const january = layoutMonth(2027, 1, newYear, '2026-11-02');

    expect(day(december, '2026-12-31').slots[0]!.leave.id).toBe('ny');
    expect(day(january, '2027-01-08').slots[0]!.leave.id).toBe('ny');
    expect(day(january, '2026-12-28').slots[0]!.showLabel).toBeTrue(); // leading days of January's grid
  });
});
