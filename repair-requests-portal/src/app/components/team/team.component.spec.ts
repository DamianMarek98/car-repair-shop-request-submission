import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { TeamComponent } from './team.component';
import { TeamService } from '../../service/team-service';
import { Employee } from '../../models/employee';
import { EmployeeList } from '../../models/employee-list';

describe('TeamComponent', () => {
  let fixture: ComponentFixture<TeamComponent>;
  let component: TeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  function employee(id: string, firstName: string, lastName: string, remaining: number): Employee {
    return {
      id, firstName, lastName, colorIndex: 0, defaultAnnualDays: 26,
      balance: { year: 2026, pool: 26, poolIsDefault: true, taken: 0, planned: 26 - remaining, remaining },
    };
  }

  function list(year: number): EmployeeList {
    return {
      today: '2026-11-02', year, availableYears: [2026, 2027],
      employees: [
        employee('1', 'Agnieszka', 'Dąbrowska', 20),
        employee('2', 'Joanna', 'Lewandowska', -2),
        employee('3', 'Tomasz', 'Nowak', 1),
      ],
    };
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-test="employee-row"]'));
  }

  beforeEach(async () => {
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['list', 'create', 'update', 'setPool', 'delete']);
    teamService.list.and.callFake((year?: number) => of(list(year ?? 2026)));

    await TestBed.configureTestingModule({
      imports: [TeamComponent],
      providers: [provideNoopAnimations(), { provide: TeamService, useValue: teamService }],
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

    expect(teamService.update).toHaveBeenCalledWith('3', { firstName: 'Tomek', lastName: 'Nowak', defaultAnnualDays: 26 });
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
});
