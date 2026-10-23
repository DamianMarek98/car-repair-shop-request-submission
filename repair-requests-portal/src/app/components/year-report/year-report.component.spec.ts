import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { STATUS_LABELS, YearReportComponent } from './year-report.component';
import { TeamService } from '../../service/team-service';
import { YearReport } from '../../models/year-report';

describe('YearReportComponent', () => {
  let fixture: ComponentFixture<YearReportComponent>;
  let teamService: jasmine.SpyObj<TeamService>;

  function report(year: number): YearReport {
    return {
      employee: { id: 't', firstName: 'Tomasz', lastName: 'Nowak' },
      year, generatedOn: '2026-11-02', pool: 9, poolIsDefault: false, taken: 4, planned: 4, remaining: 1,
      months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4],
      leaves: [
        { startDate: '2026-10-20', endDate: '2026-10-23', daysInYear: 4, status: 'TAKEN' },
        { startDate: '2026-12-28', endDate: '2027-01-08', daysInYear: 4, status: 'PLANNED' },
      ],
    };
  }

  function render(year?: string): void {
    fixture.componentRef.setInput('id', 't');
    if (year !== undefined) {
      fixture.componentRef.setInput('year', year);
    }
    fixture.detectChanges();
  }

  function text(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)).map((e: any) => e.textContent.trim());
  }

  beforeEach(async () => {
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['report']);
    teamService.report.and.callFake((_id: string, year?: number) => of(report(year ?? 2026)));

    await TestBed.configureTestingModule({
      imports: [YearReportComponent],
      providers: [provideRouter([]), { provide: TeamService, useValue: teamService }],
    }).compileComponents();

    fixture = TestBed.createComponent(YearReportComponent);
  });

  it('renders the four totals and twelve month cells', () => {
    render('2026');

    expect(teamService.report).toHaveBeenCalledWith('t', 2026);
    expect(text('[data-test="name"]')).toEqual(['Tomasz Nowak']);
    expect(text('[data-test="pool"]')).toEqual(['9']);
    expect(text('[data-test="taken"]')).toEqual(['4']);
    expect(text('[data-test="planned"]')).toEqual(['4']);
    expect(text('[data-test="remaining"]')).toEqual(['1']);
    expect(text('[data-test="month"]')).toEqual(['0', '0', '0', '0', '0', '0', '0', '0', '0', '4', '0', '4']);
  });

  it('shows full leave dates with only this year\'s days, and Polish statuses', () => {
    render('2026');

    const rows = text('[data-test="leave-row"]');
    expect(rows[1]).toContain('28.12.2026');
    expect(rows[1]).toContain('08.01.2027');
    expect(text('[data-test="status"]')).toEqual(['Wykorzystany', 'Zaplanowany']);
    expect(STATUS_LABELS.IN_PROGRESS).toBe('W trakcie');
  });

  it('shows the go-live note only for 2026', () => {
    render('2026');
    expect(fixture.nativeElement.querySelector('[data-test="go-live-note"]')).not.toBeNull();

    render('2027');
    expect(teamService.report).toHaveBeenCalledWith('t', 2027);
    expect(fixture.nativeElement.querySelector('[data-test="go-live-note"]')).toBeNull();
  });

  it('without a year lets the backend pick its current year', () => {
    render();

    expect(teamService.report).toHaveBeenCalledWith('t', undefined);
  });

  it('Drukuj opens the browser print dialog', () => {
    const print = spyOn(window, 'print');
    render('2026');

    fixture.nativeElement.querySelector('[data-test="print"]').click();

    expect(print).toHaveBeenCalled();
  });
});
