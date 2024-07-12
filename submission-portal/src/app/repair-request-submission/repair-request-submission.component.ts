import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
export class RepairRequestSubmissionComponent {
  repairForm: FormGroup;
  todaysDate: Date = new Date();

  constructor(private fb: FormBuilder, private repairRequestService: RepairRequestService) {
    this.repairForm = this.fb.group({
      vin: ['', [Validators.required, Validators.minLength(17), Validators.maxLength(17)]],
      issueDescription: ['', [Validators.required, Validators.maxLength(500)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]], //todo add validator
      timeSlots: this.fb.array([]),
      asap: new FormControl(false)
    });
    this.addTimeSlot();
  }

  get timeSlots() {
    return this.repairForm.get('timeSlots') as FormArray;
  }

  addTimeSlot() {
    if (this.isAsap() === false && this.timeSlots.length < 5) {
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
        vin: this.repairForm.get('vin')?.value,
        issueDescription: this.repairForm.get('issueDescription')?.value,
        firstName: this.repairForm.get('firstName')?.value,
        lastName: this.repairForm.get('lastName')?.value,
        email: this.repairForm.get('email')?.value,
        phoneNumber: this.repairForm.get('phoneNumber')?.value,
        timeSlots: this.mapTimeSlots(this.repairForm.get('timeSlots')?.value),
        asap: this.repairForm.get('asap')?.value,
      }
      this.repairRequestService.submitRepairRequest(repairRequest).subscribe(value => console.log('submitted'));
    }
  }

  mapTimeSlots(formGroup: any[]): TimeSlot[] {
    var timeSlots: TimeSlot[] = [];
    formGroup.forEach(formElement => {
      const timeSlot: TimeSlot = {
        date: formElement.date,
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
    if (this.isAsap() === true) {
      this.timeSlots.clear();
      this.timeSlots.reset();
    } else {
      this.addTimeSlot();
    }
  }

  dateFilter = (date: Date | null): boolean => {
    if (!date) {
      return true;
    }

    const day = date.getDay();
    // Disable Saturdays (6) and Sundays (0)
    if (day === 0 || day === 6) {
      return false;
    }

    return true;
  };

  getTimeSlotsLength(): number {
    return this.timeSlots.length;
  }
}
