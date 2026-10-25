import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { PL_DATE_FORMATS, PlDateAdapter } from './pl-date-adapter';

describe('PlDateAdapter', () => {
  let adapter: PlDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlDateAdapter, { provide: MAT_DATE_LOCALE, useValue: 'pl-PL' }],
    });
    adapter = TestBed.inject(PlDateAdapter);
  });

  it('reads typed dates as dd.mm.rrrr', () => {
    const date = adapter.parse('10.11.2026')!;

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 10]);
    expect(adapter.parse(' 1.2.2027 ')!.getMonth()).toBe(1);
  });

  it('marks impossible or other-format dates invalid, and blank as no date', () => {
    expect(adapter.isValid(adapter.parse('31.02.2027')!)).toBeFalse();
    expect(adapter.isValid(adapter.parse('11/10/2026')!)).toBeFalse();
    expect(adapter.isValid(adapter.parse('jutro')!)).toBeFalse();
    expect(adapter.parse('')).toBeNull();
    expect(adapter.parse('   ')).toBeNull();
  });

  it('starts weeks on Monday', () => {
    expect(adapter.getFirstDayOfWeek()).toBe(1);
  });

  it('shows the input as zero-padded dd.mm.rrrr', () => {
    expect(adapter.format(new Date(2026, 11, 1), PL_DATE_FORMATS.display.dateInput)).toBe('01.12.2026');
  });
});
