import { daysLabel } from './days-label';

describe('daysLabel', () => {
  it('uses "dzień" only for one', () => {
    expect(daysLabel(1)).toBe('1 dzień');
    expect(daysLabel(-1)).toBe('-1 dzień');
  });

  it('uses "dni" otherwise', () => {
    expect(daysLabel(0)).toBe('0 dni');
    expect(daysLabel(5)).toBe('5 dni');
    expect(daysLabel(-2)).toBe('-2 dni');
  });
});
