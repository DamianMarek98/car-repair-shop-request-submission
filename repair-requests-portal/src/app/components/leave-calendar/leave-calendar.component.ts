import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { monthGridRange } from '../../commons/calendar-layout';
import { daysLabel } from '../../commons/days-label';
import { daysBetween, formatPl, IsoDate, isValidIsoDate, monthOf, POLISH_MONTHS, yearOf } from '../../commons/iso-date';
import { LeavePreview, previewLeave } from '../../commons/leave-preview';
import { teamErrorMessage, teamErrorMessageForCode } from '../../commons/team-error-messages';
import { colorFor } from '../../commons/worker-colors';
import { Balance, Employee } from '../../models/employee';
import { EmployeeList } from '../../models/employee-list';
import { Leave, LeaveSaveResult } from '../../models/leave';
import { LeaveService } from '../../service/leave-service';
import { TeamService } from '../../service/team-service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { MonthGridComponent } from './month-grid/month-grid.component';

/** Same sanity limit as the shop's LeavePolicy - longer ranges are rejected there anyway. */
const MAX_CALENDAR_DAYS = 60;

/**
 * Urlopy: month calendar of who is off, plus the side form to add, edit and delete leave. "Today" and
 * every balance come from the backend; the live preview only lets the editor see the result coming -
 * the backend recomputes on save and is the authority.
 */
@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  // MatDialog / MatSnackBar are root services - importing their modules would add a second, component-level
  // provider (and bypass test doubles)
  imports: [MonthGridComponent, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './leave-calendar.component.html',
  styleUrl: './leave-calendar.component.css'
})
export class LeaveCalendarComponent implements OnInit {
  readonly daysLabel = daysLabel;
  readonly formatPl = formatPl;

  today: IsoDate = '';
  viewYear = 0;
  /** 1-12 */
  viewMonth = 0;
  loadError = '';

  employees: Employee[] = [];
  employeeById = new Map<string, Employee>();
  /** balances per year, loaded on demand (the form can touch two years) */
  private lists = new Map<number, EmployeeList>();
  private loadingYears = new Set<number>();

  private gridLeaves: Leave[] = [];
  /** what the grid shows - a stable array, so the grid only re-lays out on real changes */
  shownLeaves: Leave[] = [];
  onlySelected = false;

  // ===== side form =====
  employeeId: string | null = null;
  start: IsoDate = '';
  end: IsoDate = '';
  /** the first of two calendar clicks was made; the next click sets the end */
  picking = false;
  editing: Leave | null = null;
  employeeLeaves: Leave[] = [];
  private employeeLeavesKey = '';
  saving = false;
  formError = '';

  constructor(private teamService: TeamService, private leaveService: LeaveService, private dialog: MatDialog,
              private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.teamService.list().subscribe({
      next: list => {
        this.today = list.today;
        this.viewYear = yearOf(list.today);
        this.viewMonth = monthOf(list.today);
        this.lists.set(list.year, list);
        this.employees = list.employees;
        this.employeeById = new Map(list.employees.map(e => [e.id, e]));
        this.employeeId = list.employees[0]?.id ?? null;
        this.refreshGrid();
        this.refreshEmployeeLeaves();
      },
      error: error => this.loadError = teamErrorMessage(error),
    });
  }

  get monthLabel(): string {
    return `${POLISH_MONTHS[this.viewMonth - 1]} ${this.viewYear}`;
  }

  /** the year the form talks about: the start date's year, else the visible month's */
  get formYear(): number {
    return isValidIsoDate(this.start) ? yearOf(this.start) : this.viewYear;
  }

  get selectedEmployee(): Employee | undefined {
    return this.employeeId ? this.employeeById.get(this.employeeId) : undefined;
  }

  get formBalance(): Balance | undefined {
    return this.balanceOf(this.formYear);
  }

  get dotColor(): string {
    return colorFor(this.selectedEmployee?.colorIndex).text;
  }

  get hasRange(): boolean {
    return isValidIsoDate(this.start) && isValidIsoDate(this.end);
  }

  get preview(): LeavePreview | null {
    if (!this.hasRange || this.end < this.start || !this.employeeId) {
      return null;
    }
    const balances = new Map<number, Balance>();
    for (const year of [yearOf(this.start), yearOf(this.end)]) {
      const balance = this.balanceOf(year);
      if (balance) {
        balances.set(year, balance);
      }
    }
    return previewLeave(this.start, this.end, balances, this.editing);
  }

  /** a client-side rejection, worded like the backend's; null while the range is fine or incomplete */
  get rangeError(): string {
    if (!this.hasRange) {
      return '';
    }
    if (this.end < this.start || daysBetween(this.start, this.end) + 1 > MAX_CALENDAR_DAYS) {
      return teamErrorMessageForCode('INVALID_RANGE');
    }
    return this.preview?.workingDays === 0 ? teamErrorMessageForCode('NO_WORKING_DAYS') : '';
  }

  get canSave(): boolean {
    return !!this.employeeId && this.hasRange && !this.rangeError && !this.saving;
  }

  // ===== month navigation =====

  shiftMonth(delta: number): void {
    const index = this.viewYear * 12 + (this.viewMonth - 1) + delta;
    this.viewYear = Math.floor(index / 12);
    this.viewMonth = index % 12 + 1;
    this.refreshGrid();
    this.ensureYear(this.viewYear);
  }

  goToday(): void {
    this.viewYear = yearOf(this.today);
    this.viewMonth = monthOf(this.today);
    this.refreshGrid();
  }

  toggleOnlySelected(): void {
    this.onlySelected = !this.onlySelected;
    this.updateShownLeaves();
  }

  // ===== form =====

  onEmployeeChange(id: string): void {
    this.employeeId = id;
    this.formError = '';
    this.updateShownLeaves();
    this.refreshEmployeeLeaves();
  }

  onStartChange(value: string): void {
    this.start = value;
    if (this.end && isValidIsoDate(value) && this.end < value) {
      this.end = value;
    }
    this.afterRangeChange();
  }

  onEndChange(value: string): void {
    this.end = value;
    this.afterRangeChange();
  }

  /** First click sets a one-day range, the second sets the end (swapped if it is earlier). */
  onDayClick(date: IsoDate): void {
    if (!this.picking) {
      this.start = date;
      this.end = date;
      this.picking = true;
    } else {
      if (date < this.start) {
        this.end = this.start;
        this.start = date;
      } else {
        this.end = date;
      }
      this.picking = false;
    }
    this.formError = '';
    this.ensureFormYears();
    this.refreshEmployeeLeaves();
  }

  /** Clicking a bar loads that leave into the form for editing - the way to reshape leave around holidays (D5). */
  editLeave(leave: Leave): void {
    this.editing = leave;
    this.employeeId = leave.employeeId;
    this.start = leave.startDate;
    this.end = leave.endDate;
    this.picking = false;
    this.formError = '';
    this.updateShownLeaves();
    this.ensureFormYears();
    this.refreshEmployeeLeaves();
  }

  cancelEdit(): void {
    this.editing = null;
    this.clearRange();
  }

  save(): void {
    if (!this.canSave) {
      return;
    }
    this.saving = true;
    this.formError = '';
    const save$ = this.editing
      ? this.leaveService.update(this.editing.id, { startDate: this.start, endDate: this.end })
      : this.leaveService.create({ employeeId: this.employeeId!, startDate: this.start, endDate: this.end });
    save$.subscribe({
      next: result => {
        this.saving = false;
        this.announce(result);
        this.editing = null;
        this.clearRange();
        this.reloadAfterChange();
      },
      error: error => {
        this.saving = false;
        this.formError = teamErrorMessage(error);
      },
    });
  }

  askDelete(leave: Leave): void {
    const employee = this.employeeById.get(leave.employeeId);
    const data: ConfirmDialogData = {
      title: 'Usuń urlop',
      message: `Czy na pewno usunąć urlop ${formatPl(leave.startDate)} – ${formatPl(leave.endDate)}`
        + (employee ? ` pracownika: ${employee.firstName} ${employee.lastName}?` : '?'),
      confirmLabel: 'Usuń',
    };
    this.dialog.open(ConfirmDialogComponent, { data, width: '440px' }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.leaveService.delete(leave.id).subscribe({
        next: () => {
          if (this.editing?.id === leave.id) {
            this.cancelEdit();
          }
          this.reloadAfterChange();
        },
        error: error => this.formError = teamErrorMessage(error),
      });
    });
  }

  isPast(leave: Leave): boolean {
    return leave.endDate < this.today;
  }

  overPoolText(days: number, year: number): string {
    return `Przekroczono pulę na ${year} o ${daysLabel(-days)}. Urlop zostanie zapisany.`;
  }

  // ===== loading =====

  private announce(result: LeaveSaveResult): void {
    const warnings = result.warnings.map(w => `Przekroczono pulę na ${w.year} o ${daysLabel(-w.remaining)}.`);
    this.snackBar.open(['Zapisano urlop.', ...warnings].join(' '), 'OK', { duration: warnings.length ? 8000 : 3000 });
  }

  private afterRangeChange(): void {
    this.picking = false;
    this.formError = '';
    this.ensureFormYears();
    this.refreshEmployeeLeaves();
  }

  private clearRange(): void {
    this.start = '';
    this.end = '';
    this.picking = false;
    this.formError = '';
    this.updateShownLeaves();
    this.refreshEmployeeLeaves();
  }

  private reloadAfterChange(): void {
    this.lists.clear();
    this.ensureYear(this.viewYear);
    this.ensureFormYears();
    this.refreshGrid();
    this.refreshEmployeeLeaves(true);
  }

  private refreshGrid(): void {
    const grid = monthGridRange(this.viewYear, this.viewMonth);
    this.leaveService.inRange(grid.start, grid.end).subscribe({
      next: leaves => {
        this.gridLeaves = leaves;
        this.updateShownLeaves();
      },
      error: error => this.loadError = teamErrorMessage(error),
    });
  }

  private updateShownLeaves(): void {
    this.shownLeaves = this.onlySelected && this.employeeId
      ? this.gridLeaves.filter(leave => leave.employeeId === this.employeeId)
      : this.gridLeaves;
  }

  private refreshEmployeeLeaves(force = false): void {
    if (!this.employeeId) {
      this.employeeLeaves = [];
      return;
    }
    const key = `${this.employeeId}:${this.formYear}`;
    if (!force && key === this.employeeLeavesKey) {
      return;
    }
    this.employeeLeavesKey = key;
    this.leaveService.forEmployee(this.employeeId, this.formYear).subscribe({
      next: leaves => this.employeeLeaves = leaves,
      error: error => this.formError = teamErrorMessage(error),
    });
  }

  private ensureFormYears(): void {
    this.ensureYear(this.formYear);
    if (isValidIsoDate(this.end)) {
      this.ensureYear(yearOf(this.end));
    }
  }

  private ensureYear(year: number): void {
    if (this.lists.has(year) || this.loadingYears.has(year)) {
      return;
    }
    this.loadingYears.add(year);
    this.teamService.list(year).subscribe({
      next: list => {
        this.loadingYears.delete(year);
        this.lists.set(year, list);
      },
      error: error => {
        this.loadingYears.delete(year);
        this.loadError = teamErrorMessage(error);
      },
    });
  }

  private balanceOf(year: number): Balance | undefined {
    return this.lists.get(year)?.employees.find(e => e.id === this.employeeId)?.balance;
  }
}
