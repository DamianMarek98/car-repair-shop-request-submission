import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, model } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UnavailableDay } from '../../models/unavailable-day';
import { UnavailableDaysService } from '../../service/unavailable-days-service';

@Component({
  selector: 'app-unavailable-days',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule],
  templateUrl: './unavailable-days.component.html',
  styleUrl: './unavailable-days.component.css'
})
export class UnavailableDaysComponent {
  unavailableDaysForm: FormGroup;
  todaysDate: Date = new Date();
  selected: Date | null = null;
  unavailableDays: UnavailableDay[] = [];
  dateFilter = (date: Date | null): boolean => { return true };

  constructor(private fb: FormBuilder, private unavailableDaysService: UnavailableDaysService, private cdr: ChangeDetectorRef) {
    this.unavailableDaysForm = this.fb.group({
      date: [Validators.required],
    });
    this.loadUnavailableDays();
  }

  private loadUnavailableDays() {
    this.unavailableDaysService.getAll().subscribe({
      next: (days) => {
        this.unavailableDays = days;
        this.dateFilter = (date: Date | null): boolean => {
          if (!date) {
            return true;
          }

          const day = date.getDay();
          // Disable Saturdays (6) and Sundays (0)
          if (day === 0 || day === 6) {
            return false;
          }

          if (this.unavailableDays.findIndex(unavailableDay => this.normalizeDate(date) === unavailableDay.date.toString()) !== -1) {
            return false;
          }

          return true;
        };
      }
    });
  }

  setAsUnavailableSelectedDate(): void {
    if (this.selected === null) {
      return;
    }
    this.unavailableDaysService.addUnavailableDate(this.normalizeDate(this.selected)).subscribe({
      next: () => this.loadUnavailableDays()
    });
  }

  clearUnavailableDys(): void {
    this.unavailableDaysService.clearUnavailableDys().subscribe({
      next: () => this.loadUnavailableDays()
    });
  }

  normalizeDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
