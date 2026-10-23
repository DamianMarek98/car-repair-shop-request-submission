import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { concatMap, Observable, of } from 'rxjs';
import { daysLabel } from '../../commons/days-label';
import { teamErrorMessage, teamErrorMessageForCode } from '../../commons/team-error-messages';
import { Employee, EmployeeCommand } from '../../models/employee';
import { EmployeeList } from '../../models/employee-list';
import { TeamService } from '../../service/team-service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

const DEFAULT_POOL = 26;
const MAX_POOL = 365;
const MAX_NAME_LENGTH = 60;

/**
 * Zespół: employees with their leave pool for the selected year. The year selector, "today" and every
 * number come from the backend (`EmployeeList`); this component only edits names and pools.
 */
@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDialogModule, RouterLink],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent implements OnInit {
  readonly displayedColumns = ['firstName', 'lastName', 'pool', 'taken', 'planned', 'remaining', 'open'];
  readonly daysLabel = daysLabel;

  list: EmployeeList | null = null;
  year: number | undefined;
  search = '';
  loadError = '';

  /** the employee in the editor; null while adding a new one or with nothing selected */
  selected: Employee | null = null;
  isNew = false;
  saving = false;
  formError = '';
  form: FormGroup;

  constructor(private teamService: TeamService, private dialog: MatDialog, fb: FormBuilder) {
    this.form = fb.group({
      firstName: [''],
      lastName: [''],
      yearPool: [DEFAULT_POOL],
      defaultAnnualDays: [DEFAULT_POOL],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  get rows(): Employee[] {
    const employees = this.list?.employees ?? [];
    const query = normalize(this.search.trim());
    return query ? employees.filter(e => normalize(`${e.firstName} ${e.lastName}`).includes(query)) : employees;
  }

  get showEditor(): boolean {
    return this.isNew || this.selected !== null;
  }

  get isCurrentYear(): boolean {
    return !!this.list && this.year === Number(this.list.today.slice(0, 4));
  }

  /** share of the pool already used or planned, for the progress bar (0-100) */
  get usedPercent(): number {
    const balance = this.selected?.balance;
    if (!balance || balance.pool <= 0) {
      return balance && balance.taken + balance.planned > 0 ? 100 : 0;
    }
    return Math.min(100, Math.round((balance.taken + balance.planned) / balance.pool * 100));
  }

  onYearChange(year: number): void {
    this.load(year);
  }

  select(employee: Employee): void {
    this.isNew = false;
    this.selected = employee;
    this.formError = '';
    this.form.setValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      yearPool: employee.balance.pool,
      defaultAnnualDays: employee.defaultAnnualDays,
    });
  }

  startNew(): void {
    this.isNew = true;
    this.selected = null;
    this.formError = '';
    this.form.setValue({ firstName: '', lastName: '', yearPool: DEFAULT_POOL, defaultAnnualDays: DEFAULT_POOL });
  }

  cancel(): void {
    if (this.selected) {
      this.select(this.selected);
    } else {
      this.isNew = false;
      this.formError = '';
    }
  }

  save(): void {
    const value = this.form.getRawValue();
    const command: EmployeeCommand = {
      firstName: (value.firstName ?? '').trim(),
      lastName: (value.lastName ?? '').trim(),
      defaultAnnualDays: value.defaultAnnualDays,
    };
    const invalid = validate(command, value.yearPool);
    if (invalid) {
      this.formError = teamErrorMessageForCode(invalid);
      return;
    }

    const year = this.year!;
    const yearPool: number = value.yearPool;
    let save$: Observable<Employee>;
    if (this.selected) {
      const employee = this.selected;
      // only a changed number becomes a hand-typed pool; an untouched default stays a default
      const poolChanged = yearPool !== employee.balance.pool;
      save$ = this.teamService.update(employee.id, command).pipe(
        concatMap(saved => poolChanged ? this.teamService.setPool(saved.id, year, yearPool) : of(saved)));
    } else {
      save$ = this.teamService.create(command).pipe(
        concatMap(saved => yearPool !== saved.defaultAnnualDays ? this.teamService.setPool(saved.id, year, yearPool) : of(saved)));
    }
    this.run(save$, saved => saved.id);
  }

  /** Drops the hand-typed pool of the selected year, so the default applies again. */
  restoreDefaultPool(): void {
    if (this.selected) {
      this.run(this.teamService.setPool(this.selected.id, this.year!, null), saved => saved.id);
    }
  }

  askDelete(): void {
    const employee = this.selected;
    if (!employee) {
      return;
    }
    const data: ConfirmDialogData = {
      title: 'Usuń pracownika',
      // "pracownika: <name>" avoids declining the name (usunąć Jana Testowego), which we can't do reliably
      message: `Czy na pewno usunąć pracownika: ${employee.firstName} ${employee.lastName}? Zapisane urlopy tego pracownika również zostaną usunięte.`,
      confirmLabel: 'Usuń',
    };
    this.dialog.open(ConfirmDialogComponent, { data, width: '440px' }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.run(this.teamService.delete(employee.id), () => null);
      }
    });
  }

  /** Runs a mutation, then reloads the list and re-selects `selectId(result)` (or clears the editor). */
  private run<T>(mutation$: Observable<T>, selectId: (result: T) => string | null): void {
    this.saving = true;
    this.formError = '';
    mutation$.subscribe({
      next: result => {
        this.saving = false;
        this.isNew = false;
        this.load(this.year, selectId(result));
      },
      error: error => {
        this.saving = false;
        this.formError = teamErrorMessage(error);
      },
    });
  }

  private load(year?: number, selectId: string | null | undefined = this.selected?.id): void {
    this.teamService.list(year).subscribe({
      next: list => {
        this.list = list;
        this.year = list.year;
        this.loadError = '';
        const selected = selectId ? list.employees.find(e => e.id === selectId) : undefined;
        if (selected) {
          this.select(selected);
        } else if (!this.isNew) {
          this.selected = null;
        }
      },
      error: error => this.loadError = teamErrorMessage(error),
    });
  }
}

/** Returns the backend error code the same input would produce, so the message is identical. */
function validate(command: EmployeeCommand, yearPool: unknown): string | null {
  const nameOk = (name: string) => name.length >= 1 && name.length <= MAX_NAME_LENGTH;
  if (!nameOk(command.firstName) || !nameOk(command.lastName)) {
    return 'INVALID_NAME';
  }
  const poolOk = (days: unknown) => Number.isInteger(days) && (days as number) >= 0 && (days as number) <= MAX_POOL;
  if (!poolOk(command.defaultAnnualDays) || !poolOk(yearPool)) {
    return 'INVALID_POOL';
  }
  return null;
}

/** Case- and diacritics-insensitive search: "wisniewska" finds "Wiśniewska", "zielinski" finds "Zieliński". */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
}
