import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RepairRequestService } from '../services/repair-request-service';
import { RepairRequest, TimeSlot } from '../models/repair-request';
import { UnavailableDaysService } from '../services/unavailable-days-service';

function atLeastOneFieldNotNull(fields: string[]): ValidatorFn {
  return (formGroup: AbstractControl): { [key: string]: any } | null => {
    const isAtLeastOneFieldNotNull = fields.some(field => {
      const control = formGroup.get(field);
      return control && control.value !== null && control.value !== '';
    });

    return isAtLeastOneFieldNotNull ? null : { atLeastOneFieldNotNull: true };
  };
}

@Component({
  selector: 'app-repair-request-submission',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './repair-request-submission.component.html',
  styleUrl: './repair-request-submission.component.css'
})
export class RepairRequestSubmissionComponent implements OnInit {
  repairForm: FormGroup;
  submitted: boolean = false;
  todayDate: Date = new Date();
  times: string[] = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  dateFilter = (date: Date | null): boolean => { return true };

  constructor(private fb: FormBuilder, private repairRequestService: RepairRequestService, private unavailableDaysService: UnavailableDaysService, private cdr: ChangeDetectorRef) {
    this.repairForm = this.fb.group({
      vin: ['', [Validators.minLength(17), Validators.maxLength(17)]],
      plateNumber: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(7)]],
      issueDescription: ['', [Validators.required, Validators.maxLength(500)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^(\\+\\d{1,3}( )?)?((\\(\\d{3}\\))|\\d{3})[- .]?\\d{3}[- .]?\\d{4}$'
        + '|^(\\+\\d{1,3}( )?)?(\\d{3}[ ]?){2}\\d{3}$'
        + '|^(\\+\\d{1,3}( )?)?(\\d{3}[ ]?)(\\d{2}[ ]?){2}\\d{2}$')]],
      timeSlots: this.fb.array([]),
      asap: new FormControl(false),
      rodo: new FormControl(false, Validators.requiredTrue),
    }, { validators: atLeastOneFieldNotNull(['vin', 'plateNumber']) });
    this.addTimeSlot();
  }
  ngOnInit(): void {
    var submittedDate = localStorage.getItem("submitted-date");
    if (submittedDate) {
      var submittedEndDateTime = new Date(submittedDate);
      submittedEndDateTime.setHours(23, 59, 59, 99);
      if (submittedEndDateTime >= new Date()) {
        this.submitted = true;
      }
    }

    this.unavailableDaysService.getAll().subscribe({
      next: (days) => {
        this.dateFilter = (date: Date | null): boolean => {
          if (!date) {
            return true;
          }

          const day = date.getDay();
          // Disable Saturdays (6) and Sundays (0)
          if (day === 0 || day === 6) {
            return false;
          }

          return days.findIndex(unavailableDay => this.normalizeDate(date) === unavailableDay.date.toString()) === -1;
        };
      }
    });
  }

  get timeSlots() {
    return this.repairForm.get('timeSlots') as FormArray;
  }

  addTimeSlot() {
    if (!this.isAsap() && this.timeSlots.length < 5) {
      const timeSlotGroup = this.fb.group({
        date: [Validators.required],
        from: [null],
        to: [null]
      });
      this.timeSlots.push(timeSlotGroup);
    }
  }

  removeTimeSlot(index: number) {
    if (this.timeSlots.length === 1) {
      return;
    }
    this.timeSlots.removeAt(index);
  }

  onSubmit() {
    if (this.repairForm.valid) {
      const repairRequest: RepairRequest = {
        vin: this.mapToNullOnEmpty(this.repairForm.get('vin')?.value),
        plateNumber: this.repairForm.get('plateNumber')?.value,
        issueDescription: this.repairForm.get('issueDescription')?.value,
        firstName: this.repairForm.get('firstName')?.value,
        lastName: this.repairForm.get('lastName')?.value,
        email: this.repairForm.get('email')?.value,
        phoneNumber: this.repairForm.get('phoneNumber')?.value,
        timeSlots: this.mapTimeSlots(this.repairForm.get('timeSlots')?.value),
        asap: this.repairForm.get('asap')?.value,
        rodo: this.repairForm.get('rodo')?.value,
      }
      this.repairRequestService.submitRepairRequest(repairRequest).subscribe(() => {
        var submittedDate = new Date();
        localStorage.setItem("submitted-date", submittedDate.toDateString());
        this.submitted = true;
        this.cdr.detectChanges();
      });
    }
  }

  mapToNullOnEmpty(value: any): string | null {
    return value === '' ? null : value;
  }

  mapTimeSlots(formGroup: any[]): TimeSlot[] {
    const timeSlots: TimeSlot[] = [];
    formGroup.forEach(formElement => {
      const timeSlot: TimeSlot = {
        date: new Date(Date.UTC(formElement.date.getFullYear(), formElement.date.getMonth(), formElement.date.getDate())).toISOString(),
        from: formElement.from,
        to: formElement.to,
      }
      timeSlots.push(timeSlot);
    })

    return timeSlots;
  }

  isAsap(): boolean {
    return this.repairForm.get('asap')?.value
  }

  resetTimeSlots() {
    if (this.isAsap()) {
      this.timeSlots.clear();
      this.timeSlots.reset();
    } else {
      this.addTimeSlot();
    }
  }

  getTimeSlotsLength(): number {
    return this.timeSlots.length;
  }

  normalizeDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
