import { expiryOf, isExpiryDateAllowed } from './expiry-status';

describe('expiry-status', () => {
  // the local scenario's today: +1 month = 2026-12-02, +3 months = 2027-02-02
  const TODAY = '2026-11-02';

  it('treats no date as missing, without colour', () => {
    expect(expiryOf(null, TODAY)).toEqual({ status: 'MISSING', level: 'none', note: '', hint: 'Brak daty' });
    expect(expiryOf('', TODAY).status).toBe('MISSING');
  });

  it('shows an expired date in red with the days since', () => {
    expect(expiryOf('2026-11-01', TODAY))
      .toEqual({ status: 'EXPIRED', level: 'danger', note: 'wygasło 1 dzień temu', hint: 'Wygasło 1 dzień temu' });
    expect(expiryOf('2026-10-28', TODAY).note).toBe('wygasło 5 dni temu');
  });

  it('is still valid on its last day, in red', () => {
    expect(expiryOf(TODAY, TODAY))
      .toEqual({ status: 'URGENT', level: 'danger', note: 'wygasa dziś', hint: 'Wygasa dziś' });
  });

  it('is red when less than a month is left', () => {
    expect(expiryOf('2026-11-03', TODAY))
      .toEqual({ status: 'URGENT', level: 'danger', note: 'za 1 dzień', hint: 'Wygasa za 1 dzień' });
    expect(expiryOf('2026-12-01', TODAY).status).toBe('URGENT');   // last red day
  });

  it('is yellow from exactly one month to less than three months', () => {
    expect(expiryOf('2026-12-02', TODAY))
      .toEqual({ status: 'SOON', level: 'warning', note: 'za 30 dni', hint: 'Wygasa za 30 dni' });
    expect(expiryOf('2027-02-01', TODAY).status).toBe('SOON');     // last yellow day
  });

  it('is plain from exactly three months on', () => {
    expect(expiryOf('2027-02-02', TODAY)).toEqual({ status: 'OK', level: 'none', note: '', hint: 'Ważne' });
    expect(expiryOf('2030-01-01', TODAY).status).toBe('OK');
  });

  it('allows a new date from tomorrow up to 10 years ahead', () => {
    expect(isExpiryDateAllowed('2026-11-03', null, TODAY)).toBeTrue();
    expect(isExpiryDateAllowed('2036-11-02', null, TODAY)).toBeTrue();
    expect(isExpiryDateAllowed(TODAY, null, TODAY)).toBeFalse();
    expect(isExpiryDateAllowed('2026-11-01', null, TODAY)).toBeFalse();
    expect(isExpiryDateAllowed('2036-11-03', null, TODAY)).toBeFalse();
  });

  it('allows no date and an unchanged date, even an expired one', () => {
    expect(isExpiryDateAllowed(null, '2027-01-01', TODAY)).toBeTrue();
    expect(isExpiryDateAllowed('2026-10-01', '2026-10-01', TODAY)).toBeTrue();
    expect(isExpiryDateAllowed('2026-10-02', '2026-10-01', TODAY)).toBeFalse();
  });
});
