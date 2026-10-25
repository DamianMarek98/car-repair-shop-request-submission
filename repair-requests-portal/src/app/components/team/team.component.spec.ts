import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { TeamComponent } from './team.component';
import { TeamService } from '../../service/team-service';
import { Employee } from '../../models/employee';
import { EmployeeList } from '../../models/employee-list';

describe('TeamComponent', () => {
  let fixture: ComponentFixture<TeamComponent>;
  let component: TeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  function employee(id: string, firstName: string, lastName: string, remaining: number,
                    medicalExamValidUntil: string | null = null, bhpTrainingValidUntil: string | null = null): Employee {
    return {
      id, firstName, lastName, colorIndex: 0, defaultAnnualDays: 26, medicalExamValidUntil, bhpTrainingValidUntil,
      balance: { year: 2026, pool: 26, poolIsDefault: true, taken: 0, planned: 26 - remaining, remaining },
    };
  }

  function list(year: number): EmployeeList {
    return {
      today: '2026-11-02', year, availableYears: [2026, 2027],
      employees: [
        // today 2026-11-02: red (< 1 month) · OK
        employee('1', 'Agnieszka', 'Dąbrowska', 20, '2026-12-01', '2027-06-01'),
        // OK (exactly 3 months) · red, expired a month ago
        employee('2', 'Joanna', 'Lewandowska', -2, '2027-02-02', '2026-10-01'),
        // yellow (exactly 1 month) · no date
        employee('3', 'Tomasz', 'Nowak', 1, '2026-12-02', null),
      ],
    };
  }

  function expiryCells(row: HTMLElement): HTMLElement[] {
    return Array.from(row.querySelectorAll('[data-test="expiry"]'));
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-test="employee-row"]'));
  }

  beforeEach(async () => {
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['list', 'create', 'update', 'setPool', 'delete']);
    teamService.list.and.callFake((year?: number) => of(list(year ?? 2026)));

    await TestBed.configureTestingModule({
      imports: [TeamComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: TeamService, useValue: teamService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the backend\'s current year and renders one row per employee', () => {
    expect(teamService.list).toHaveBeenCalledWith(undefined);
    expect(component.year).toBe(2026);
    expect(rows().length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Liczba pracowników: 3');
  });

  it('narrows rows by search, ignoring case and diacritics', () => {
    component.search = 'NOW';
    fixture.detectChanges();
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('Nowak');

    component.search = 'dabrowska';
    fixture.detectChanges();
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('Dąbrowska');
  });

  it('marks a negative remaining in red', () => {
    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[data-test="remaining"]'));

    expect(chips.map(chip => chip.classList.contains('panel-chip--negative'))).toEqual([false, true, false]);
  });

  it('reloads the list for a newly selected year', () => {
    component.onYearChange(2027);

    expect(teamService.list).toHaveBeenCalledWith(2027);
    expect(component.year).toBe(2027);
  });

  it('rejects an out-of-range pool before calling the backend', () => {
    component.select(list(2026).employees[2]);
    component.form.patchValue({ yearPool: 366 });

    component.save();
    fixture.detectChanges();

    expect(teamService.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-test="form-error"]').textContent)
      .toContain('Pula urlopu musi być liczbą całkowitą od 0 do 365.');
  });

  it('saves names without typing a pool when the year pool is unchanged', () => {
    const tomasz = list(2026).employees[2];
    teamService.update.and.returnValue(of(tomasz));
    component.select(tomasz);
    component.form.patchValue({ firstName: 'Tomek' });

    component.save();

    expect(teamService.update).toHaveBeenCalledWith('3', {
      firstName: 'Tomek', lastName: 'Nowak', defaultAnnualDays: 26,
      medicalExamValidUntil: '2026-12-02', bhpTrainingValidUntil: null,
    });
    expect(teamService.setPool).not.toHaveBeenCalled();
  });

  it('types the year pool when it changed', () => {
    const tomasz = list(2026).employees[2];
    teamService.update.and.returnValue(of(tomasz));
    teamService.setPool.and.returnValue(of(tomasz));
    component.select(tomasz);
    component.form.patchValue({ yearPool: 9 });

    component.save();

    expect(teamService.setPool).toHaveBeenCalledWith('3', 2026, 9);
  });

  it('shows the leave balance in one column, as remaining of the pool', () => {
    const cell: HTMLElement = rows()[1].querySelector('.mat-column-leave')!;

    expect(cell.textContent).toContain('-2 dni');
    expect(cell.textContent).toContain('z 26 dni');
  });

  it('colours the dates by time left: red under a month, yellow under three, grey without a date', () => {
    const [agnieszka, joanna, tomasz] = rows().map(expiryCells);

    expect(agnieszka.map(c => c.dataset['status'])).toEqual(['URGENT', 'OK']);
    expect(agnieszka[0].classList).toContain('panel-expiry--danger');
    expect(agnieszka[0].textContent).toContain('01.12.2026');
    expect(agnieszka[0].textContent).toContain('za 29 dni');

    expect(joanna.map(c => c.dataset['status'])).toEqual(['OK', 'EXPIRED']);
    expect(joanna[1].textContent).toContain('wygasło 32 dni temu');

    expect(tomasz.map(c => c.dataset['status'])).toEqual(['SOON', 'MISSING']);
    expect(tomasz[0].classList).toContain('panel-expiry--warning');
    expect(tomasz[1].classList).toContain('panel-expiry--none');
    expect(tomasz[1].textContent!.trim()).toBe('—');
  });

  it('sends both dates, and null for a blank one, when adding a worker', () => {
    teamService.create.and.returnValue(of(employee('4', 'Jan', 'Testowy', 26)));
    component.startNew();
    component.form.patchValue({ firstName: 'Jan', lastName: 'Testowy', medicalExamValidUntil: new Date(2027, 4, 1) });

    component.save();

    expect(teamService.create).toHaveBeenCalledWith({
      firstName: 'Jan', lastName: 'Testowy', defaultAnnualDays: 26,
      medicalExamValidUntil: '2027-05-01', bhpTrainingValidUntil: null,
    });
  });

  it('refuses today as a new date before calling the backend, and says why in the hint', () => {
    component.select(list(2026).employees[2]);
    component.form.patchValue({ bhpTrainingValidUntil: new Date(2026, 10, 2) });

    component.save();
    fixture.detectChanges();

    expect(teamService.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-test="form-error"]').textContent)
      .toContain('Data ważności szkolenia BHP musi być w przyszłości');
    const hint: HTMLElement = fixture.nativeElement.querySelector('[data-test="bhp-hint"]');
    expect(hint.classList).toContain('panel-hint--danger');
    expect(hint.textContent).toContain('Wpisz datę w przyszłości');
  });

  it('saves a worker whose unchanged date has already expired', () => {
    const joanna = list(2026).employees[1];
    teamService.update.and.returnValue(of(joanna));
    component.select(joanna);
    component.form.patchValue({ firstName: 'Asia' });

    component.save();

    expect(teamService.update).toHaveBeenCalledWith('2', jasmine.objectContaining({
      firstName: 'Asia', bhpTrainingValidUntil: '2026-10-01',
    }));
  });

  it('shows the live expiry state under a date field', () => {
    component.select(list(2026).employees[2]);
    fixture.detectChanges();
    const hint = () => (fixture.nativeElement.querySelector('[data-test="medical-hint"]') as HTMLElement);

    expect(hint().textContent).toContain('Wygasa za 30 dni');
    expect(hint().classList).toContain('panel-hint--warning');

    component.form.patchValue({ medicalExamValidUntil: new Date(2028, 0, 1) });
    fixture.detectChanges();
    expect(hint().textContent).toContain('Ważne');

    component.form.patchValue({ medicalExamValidUntil: null });
    fixture.detectChanges();
    expect(hint().textContent).toContain('Brak daty');
  });

  it('loads a stored date into the picker as a local date, shown as dd.mm.rrrr', () => {
    component.select(list(2026).employees[2]);
    fixture.detectChanges();

    const value: Date = component.form.value.medicalExamValidUntil;
    expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([2026, 11, 2]);
    expect((fixture.nativeElement.querySelector('[data-test="medical-date"]') as HTMLInputElement).value)
      .toBe('02.12.2026');
  });

  it('opens the calendar when the date field is clicked', () => {
    component.select(list(2026).employees[2]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-test="bhp-date"]') as HTMLInputElement).click();
    fixture.detectChanges();

    expect(document.querySelector('mat-calendar')).withContext('calendar overlay').not.toBeNull();
  });

  it('reads a typed Polish date and refuses unreadable text instead of clearing the date', () => {
    const tomasz = list(2026).employees[2];
    teamService.update.and.returnValue(of(tomasz));
    component.select(tomasz);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-test="medical-date"]');

    input.value = '15.03.2027';
    input.dispatchEvent(new Event('input'));
    component.save();
    expect(teamService.update).toHaveBeenCalledWith('3', jasmine.objectContaining({ medicalExamValidUntil: '2027-03-15' }));

    teamService.update.calls.reset();
    input.value = '2027-03-15x';
    input.dispatchEvent(new Event('input'));
    component.save();
    fixture.detectChanges();
    expect(teamService.update).not.toHaveBeenCalled();
    expect((fixture.nativeElement.querySelector('[data-test="medical-hint"]') as HTMLElement).textContent)
      .toContain('Nieprawidłowa data');
  });

  it('lets the picker go back to an unchanged expired date, otherwise starts at tomorrow', () => {
    component.select(list(2026).employees[1]);   // Joanna: BHP expired 2026-10-01, medical 2027-02-02

    expect(component.minDate('bhpTrainingValidUntil')).toEqual(new Date(2026, 9, 1));
    expect(component.minDate('medicalExamValidUntil')).toEqual(new Date(2026, 10, 3));
    expect(component.maxDate).toEqual(new Date(2036, 10, 2));
  });
});
