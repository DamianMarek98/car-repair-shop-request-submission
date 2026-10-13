import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { parseUtc, toLocalDateString, toLocalTimeString, toUtcDateTime } from '../../commons/utc-date-time';
import { UnavailableDaysService } from '../../service/unavailable-days-service';

export const OPENS_AT = '08:00';
export const CLOSES_AT = '16:00';

function withinOpeningHours(control: AbstractControl): ValidationErrors | null {
  const time: string = control.value;
  if (!time) {
    return null;
  }
  return time.slice(0, 5) >= OPENS_AT && time.slice(0, 5) <= CLOSES_AT ? null : { openingHours: true };
}

/**
 * Visit date + time picked by the workshop. Emits the appointment as a backend UTC timestamp.
 * Mirrors shop's AppointmentTimePolicy: working day, not an unavailable day, 08:00-16:00, future.
 */
@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule,
    MatNativeDateModule, MatButtonModule, MatProgressSpinner],
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.css'
})
export class AppointmentFormComponent implements OnInit {
  /** Current appointment (UTC) to pre-fill when changing it. */
  @Input() appointmentAt: string | null = null;
  @Input() submitLabel = 'Umów wizytę';
  @Input() busy = false;
  @Input() cancellable = false;
  @Output() appointmentSubmitted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  readonly opensAt = OPENS_AT;
  readonly closesAt = CLOSES_AT;
  readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  inPast = false;
  private unavailableDates = new Set<string>();

  form = new FormGroup({
    date: new FormControl<Date | null>(null, Validators.required),
    time: new FormControl<string>('', [Validators.required, withinOpeningHours])
  });

  constructor(private unavailableDaysService: UnavailableDaysService) { }

  dateFilter = (date: Date | null): boolean => {
    if (!date) {
      return true;
    }
    const day = date.getDay();
    return day !== 0 && day !== 6 && !this.unavailableDates.has(toLocalDateString(date));
  };

  ngOnInit(): void {
    if (this.appointmentAt) {
      const current = parseUtc(this.appointmentAt);
      this.form.setValue({
        date: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
        time: toLocalTimeString(current)
      });
    }
    this.unavailableDaysService.getAll().subscribe({
      next: days => {
        this.unavailableDates = new Set(days.map(day => day.date.toString()));
        this.form.controls.date.updateValueAndValidity();
      }
    });
  }

  submit(): void {
    this.inPast = false;
    if (this.busy) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const appointmentAt = toUtcDateTime(this.form.value.date!, this.form.value.time!.slice(0, 5));
    if (parseUtc(appointmentAt).getTime() <= Date.now()) {
      this.inPast = true;
      return;
    }
    this.appointmentSubmitted.emit(appointmentAt);
  }
}
