import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { LeaveCalendarComponent } from './leave-calendar.component';
import { LeaveService } from '../../service/leave-service';
import { TeamService } from '../../service/team-service';
import { EmployeeList } from '../../models/employee-list';
import { Leave } from '../../models/leave';

describe('LeaveCalendarComponent', () => {
  let fixture: ComponentFixture<LeaveCalendarComponent>;
  let component: LeaveCalendarComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let leaveService: jasmine.SpyObj<LeaveService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const noDates = { medicalExamValidUntil: null, bhpTrainingValidUntil: null };
  const joanna = { id: 'j', firstName: 'Joanna', lastName: 'Lewandowska', colorIndex: 3, defaultAnnualDays: 26, ...noDates };
  const piotr = { id: 'p', firstName: 'Piotr', lastName: 'Kamiński', colorIndex: 4, defaultAnnualDays: 26, ...noDates };
  const piotrsLeave: Leave = {
    id: 'l1', employeeId: 'p', startDate: '2026-11-09', endDate: '2026-11-13', workingDays: 5,
    workingDaysByYear: { '2026': 5 },
  };

  function list(year: number): EmployeeList {
    return {
      today: '2026-11-02', year, availableYears: [2026, 2027],
      employees: [
        { ...joanna, balance: { year, pool: 3, poolIsDefault: false, taken: 0, planned: 5, remaining: -2 } },
        { ...piotr, balance: { year, pool: 26, poolIsDefault: true, taken: 0, planned: 5, remaining: 21 } },
      ],
    };
  }

  beforeEach(async () => {
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['list']);
    teamService.list.and.callFake((year?: number) => of(list(year ?? 2026)));
    leaveService = jasmine.createSpyObj<LeaveService>('LeaveService', ['inRange', 'forEmployee', 'create', 'update', 'delete']);
    leaveService.inRange.and.returnValue(of([piotrsLeave]));
    leaveService.forEmployee.and.returnValue(of([]));
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [LeaveCalendarComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TeamService, useValue: teamService },
        { provide: LeaveService, useValue: leaveService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens on the backend\'s month and asks for the whole visible grid', () => {
    expect(component.monthLabel).toBe('Listopad 2026');
    expect(leaveService.inRange).toHaveBeenCalledWith('2026-10-26', '2026-12-06');
    expect(fixture.nativeElement.querySelectorAll('[data-test="day-cell"]').length).toBe(42);
    expect(fixture.nativeElement.querySelectorAll('[data-leave="l1"]').length).toBe(5);
  });

  it('picks a range with two clicks, swapping an earlier second click', () => {
    component.onDayClick('2026-12-31');
    expect(component.picking).toBeTrue();
    component.onDayClick('2026-12-21');

    expect(component.start).toBe('2026-12-21');
    expect(component.end).toBe('2026-12-31');
    expect(component.picking).toBeFalse();
  });

  it('warns about an overdraw but keeps the button enabled', () => {
    component.onEmployeeChange('j');
    component.onStartChange('2026-11-23');
    component.onEndChange('2026-11-24');
    fixture.detectChanges();

    expect(component.preview!.years[0].remainingAfter).toBe(-4);
    expect(fixture.nativeElement.querySelector('[data-test="over-pool"]').textContent).toContain('Przekroczono pulę na 2026 o 4 dni');
    expect(fixture.nativeElement.querySelector('[data-test="save"]').disabled).toBeFalse();
  });

  it('a save with warnings tells the editor about every warning', () => {
    leaveService.create.and.returnValue(of({
      leave: { ...piotrsLeave, id: 'new', employeeId: 'j' }, balance: [],
      warnings: [{ code: 'POOL_EXCEEDED', year: 2026, remaining: -4 }, { code: 'POOL_EXCEEDED', year: 2027, remaining: -1 }],
    }));
    component.onEmployeeChange('j');
    component.onStartChange('2026-12-28');
    component.onEndChange('2027-01-08');

    component.save();

    expect(leaveService.create).toHaveBeenCalledWith({ employeeId: 'j', startDate: '2026-12-28', endDate: '2027-01-08' });
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    const message = snackBar.open.calls.mostRecent().args[0];
    expect(message).toContain('Przekroczono pulę na 2026 o 4 dni.');
    expect(message).toContain('Przekroczono pulę na 2027 o 1 dzień.');
    expect(component.start).toBe('');
  });

  it('clicking a bar loads the leave for editing and updates without changing the employee', () => {
    leaveService.update.and.returnValue(of({ leave: piotrsLeave, balance: [], warnings: [] }));

    component.editLeave(piotrsLeave);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-test="form-title"]').textContent).toContain('Edycja urlopu');
    component.onEndChange('2026-11-10');
    component.save();

    expect(leaveService.update).toHaveBeenCalledWith('l1', { startDate: '2026-11-09', endDate: '2026-11-10' });
    expect(component.editing).toBeNull();
  });

  it('rejects a weekend-only range before calling the backend', () => {
    component.onStartChange('2026-11-14');
    component.onEndChange('2026-11-15');
    fixture.detectChanges();

    expect(component.canSave).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-test="range-error"]').textContent)
      .toContain('Wybrany zakres obejmuje tylko weekend.');
  });
});
