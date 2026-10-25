import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { concatMap, Observable, of } from 'rxjs';
import { daysLabel } from '../../commons/days-label';
import {
  earliestExpiryDate, Expiry, expiryOf, isExpiryDateAllowed, latestExpiryDate
} from '../../commons/expiry-status';
import { formatPl, fromLocalDate, IsoDate, toLocalDate } from '../../commons/iso-date';
import { PL_DATE_FORMATS, PlDateAdapter } from '../../commons/pl-date-adapter';
import { teamErrorMessage, teamErrorMessageForCode } from '../../commons/team-error-messages';
import { Employee, EmployeeCommand } from '../../models/employee';
import { EmployeeList } from '../../models/employee-list';
import { TeamService } from '../../service/team-service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

const DEFAULT_POOL = 26;
const MAX_POOL = 365;
const MAX_NAME_LENGTH = 60;

/** The two "valid until" form controls, named like their `Employee` fields. */
type ExpiryField = 'medicalExamValidUntil' | 'bhpTrainingValidUntil';

/**
 * Zespół: employees with their leave pool for the selected year, plus their medical-exam and BHP
 * "valid until" dates. The year selector, "today" and every number come from the backend
 * (`EmployeeList`); this component edits names, pools and the two dates.
 */
@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDialogModule, MatDatepickerModule, RouterLink],
  // the two "ważne do" pickers: Polish calendar, Monday first, dd.mm.rrrr input
  providers: [
    { provide: DateAdapter, useClass: PlDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'pl-PL' },
    { provide: MAT_DATE_FORMATS, useValue: PL_DATE_FORMATS },
  ],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent implements OnInit {
  readonly displayedColumns = ['firstName', 'lastName', 'leave', 'medical', 'bhp', 'open'];
  readonly daysLabel = daysLabel;
  readonly formatPl = formatPl;

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
      // date pickers hold local-midnight Dates (or null); converted to IsoDate on load and save
      medicalExamValidUntil: [null as Date | null],
      bhpTrainingValidUntil: [null as Date | null],
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

  /** the backend's today; the dates' colours never read the browser clock */
  get today(): IsoDate {
    return this.list?.today ?? '';
  }

  /**
   * Earliest day the picker offers: tomorrow, or the stored date when that is earlier - an unchanged
   * expired date stays valid (plan §3.1), so the picker must not flag it.
   */
  minDate(field: ExpiryField): Date | null {
    if (!this.today) {
      return null;
    }
    const earliest = earliestExpiryDate(this.today);
    const stored = this.selected?.[field];
    return toLocalDate(stored && stored < earliest ? stored : earliest);
  }

  get maxDate(): Date | null {
    return this.today ? toLocalDate(latestExpiryDate(this.today)) : null;
  }

  expiry(date: IsoDate | null): Expiry {
    return expiryOf(date, this.today);
  }

  /** Hint under a date field: its live expiry state, or why the typed date can't be saved. */
  fieldExpiry(field: ExpiryField): Expiry {
    if (this.hasUnreadableDate(field)) {
      return { status: 'EXPIRED', level: 'danger', note: '', hint: 'Nieprawidłowa data, wpisz dd.mm.rrrr' };
    }
    const value = this.isoValue(field);
    if (!isExpiryDateAllowed(value, this.selected?.[field] ?? null, this.today)) {
      return { status: 'EXPIRED', level: 'danger', note: '', hint: 'Wpisz datę w przyszłości (najpóźniej za 10 lat)' };
    }
    return this.expiry(value);
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
      medicalExamValidUntil: employee.medicalExamValidUntil ? toLocalDate(employee.medicalExamValidUntil) : null,
      bhpTrainingValidUntil: employee.bhpTrainingValidUntil ? toLocalDate(employee.bhpTrainingValidUntil) : null,
    });
  }

  startNew(): void {
    this.isNew = true;
    this.selected = null;
    this.formError = '';
    this.form.setValue({
      firstName: '', lastName: '', yearPool: DEFAULT_POOL, defaultAnnualDays: DEFAULT_POOL,
      medicalExamValidUntil: null, bhpTrainingValidUntil: null,
    });
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
      // an empty picker is null, which clears the date
      medicalExamValidUntil: this.isoValue('medicalExamValidUntil'),
      bhpTrainingValidUntil: this.isoValue('bhpTrainingValidUntil'),
    };
    // unreadable typed text leaves the control at null - never save that as "no date"
    const invalid = this.hasUnreadableDate('medicalExamValidUntil') ? 'INVALID_MEDICAL_EXAM_DATE'
      : this.hasUnreadableDate('bhpTrainingValidUntil') ? 'INVALID_BHP_TRAINING_DATE'
      : validate(command, value.yearPool, this.selected, this.today);
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

  private isoValue(field: ExpiryField): IsoDate | null {
    const date: Date | null = this.form.get(field)?.value ?? null;
    return date ? fromLocalDate(date) : null;
  }

  /** Text typed into a picker that isn't a dd.mm.rrrr date. */
  private hasUnreadableDate(field: ExpiryField): boolean {
    return !!this.form.get(field)?.hasError('matDatepickerParse');
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
function validate(command: EmployeeCommand, yearPool: unknown, stored: Employee | null, today: IsoDate): string | null {
  const nameOk = (name: string) => name.length >= 1 && name.length <= MAX_NAME_LENGTH;
  if (!nameOk(command.firstName) || !nameOk(command.lastName)) {
    return 'INVALID_NAME';
  }
  const poolOk = (days: unknown) => Number.isInteger(days) && (days as number) >= 0 && (days as number) <= MAX_POOL;
  if (!poolOk(command.defaultAnnualDays) || !poolOk(yearPool)) {
    return 'INVALID_POOL';
  }
  if (!isExpiryDateAllowed(command.medicalExamValidUntil, stored?.medicalExamValidUntil ?? null, today)) {
    return 'INVALID_MEDICAL_EXAM_DATE';
  }
  if (!isExpiryDateAllowed(command.bhpTrainingValidUntil, stored?.bhpTrainingValidUntil ?? null, today)) {
    return 'INVALID_BHP_TRAINING_DATE';
  }
  return null;
}

/** Case- and diacritics-insensitive search: "wisniewska" finds "Wiśniewska", "zielinski" finds "Zieliński". */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
}
