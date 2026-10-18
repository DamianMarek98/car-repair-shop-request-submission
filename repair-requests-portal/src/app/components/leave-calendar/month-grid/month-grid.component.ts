import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CalendarSlot, CalendarWeek, layoutMonth } from '../../../commons/calendar-layout';
import { daysLabel } from '../../../commons/days-label';
import { formatPl, isoWeekday, IsoDate } from '../../../commons/iso-date';
import { colorFor } from '../../../commons/worker-colors';
import { Employee } from '../../../models/employee';
import { Leave } from '../../../models/leave';

const WEEKDAYS_SHORT = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];

interface DayEntry {
  date: IsoDate;
  label: string;
  names: string[];
}

/**
 * Presentational month grid of who is off (plan §5): bars per lane, "+N więcej", today circle, the
 * selected range. Below 1000 px a plain per-day list replaces it - switched by CSS only (SSR-safe).
 */
@Component({
  selector: 'app-month-grid',
  standalone: true,
  templateUrl: './month-grid.component.html',
  styleUrl: './month-grid.component.css'
})
export class MonthGridComponent implements OnChanges {
  @Input({ required: true }) year!: number;
  /** 1-12 */
  @Input({ required: true }) month!: number;
  @Input() leaves: Leave[] = [];
  @Input() today: IsoDate = '';
  @Input() employees = new Map<string, Employee>();
  @Input() rangeStart: IsoDate = '';
  @Input() rangeEnd: IsoDate = '';
  @Input() selectedLeaveId: string | null = null;

  @Output() dayClick = new EventEmitter<IsoDate>();
  @Output() leaveClick = new EventEmitter<Leave>();

  readonly weekdays = WEEKDAYS_SHORT;
  weeks: CalendarWeek[] = [];
  dayList: DayEntry[] = [];

  ngOnChanges(): void {
    this.weeks = layoutMonth(this.year, this.month, this.leaves, this.today);
    this.dayList = this.weeks.flatMap(week => week.days)
      .filter(day => day.inMonth)
      .map(day => ({
        date: day.date,
        label: `${day.dayOfMonth} (${WEEKDAYS_SHORT[isoWeekday(day.date) - 1]})`,
        names: this.leaves
          .filter(leave => leave.startDate <= day.date && leave.endDate >= day.date)
          .map(leave => this.shortName(leave)),
      }))
      .filter(entry => entry.names.length > 0);
  }

  inRange(date: IsoDate): boolean {
    return !!this.rangeStart && !!this.rangeEnd && date >= this.rangeStart && date <= this.rangeEnd;
  }

  label(slot: CalendarSlot): string {
    return slot.showLabel ? this.shortName(slot.leave) : ' ';
  }

  title(slot: CalendarSlot): string {
    const employee = this.employees.get(slot.leave.employeeId);
    const name = employee ? `${employee.firstName} ${employee.lastName}` : '';
    return `${name}: ${formatPl(slot.leave.startDate)} – ${formatPl(slot.leave.endDate)}`
      + ` (${daysLabel(slot.leave.workingDays)} roboczych)`;
  }

  background(slot: CalendarSlot): string {
    return colorFor(this.employees.get(slot.leave.employeeId)?.colorIndex).background;
  }

  color(slot: CalendarSlot): string {
    return colorFor(this.employees.get(slot.leave.employeeId)?.colorIndex).text;
  }

  onBarClick(event: Event, leave: Leave): void {
    event.stopPropagation();
    this.leaveClick.emit(leave);
  }

  /** "T. Nowak" */
  private shortName(leave: Leave): string {
    const employee = this.employees.get(leave.employeeId);
    return employee ? `${employee.firstName.charAt(0)}. ${employee.lastName}` : '?';
  }
}
