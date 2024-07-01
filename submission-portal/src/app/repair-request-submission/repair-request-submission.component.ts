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

  constructor(private fb: FormBuilder) {
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
  }

  get timeSlots() {
    return this.repairForm.get('timeSlots') as FormArray;
  }

  addTimeSlot() {
    const timeSlotGroup = this.fb.group({
      date: [null, Validators.required],
      from: [null],
      to: [null]
    });
    this.timeSlots.push(timeSlotGroup);
  }

  removeTimeSlot(index: number) {
    this.timeSlots.removeAt(index);
  }

  onSubmit() {
    if (this.repairForm.valid) {
      console.log(this.repairForm.value);
    }
  }

  isAsap(): boolean {
      return this.repairForm.get('asap')?.value
  }
}
