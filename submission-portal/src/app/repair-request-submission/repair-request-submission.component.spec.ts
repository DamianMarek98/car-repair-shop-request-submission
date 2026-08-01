import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { RepairRequestSubmissionComponent } from './repair-request-submission.component';
import { RepairRequestService } from '../services/repair-request-service';
import { RepairRequest } from '../models/repair-request';

describe('RepairRequestSubmissionComponent', () => {
  let component: RepairRequestSubmissionComponent;
  let fixture: ComponentFixture<RepairRequestSubmissionComponent>;
  let repairRequestService: RepairRequestService;

  beforeEach(async () => {
    localStorage.removeItem('submitted-date');

    await TestBed.configureTestingModule({
      imports: [RepairRequestSubmissionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RepairRequestSubmissionComponent);
    component = fixture.componentInstance;
    repairRequestService = TestBed.inject(RepairRequestService);
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.repairForm.patchValue({
      plateNumber: 'GD12345',
      issueDescription: 'nie dziala klimatyzacja',
      firstName: 'Damian',
      lastName: 'Marek',
      email: 'test@test.com',
      phoneNumber: '111222333',
      asap: true,
      rodo: true
    });
    component.resetTimeSlots();
  }

  function submitAndCaptureRequest(): RepairRequest {
    const spy = spyOn(repairRequestService, 'submitRepairRequest').and.returnValue(of({}));
    component.onSubmit();
    expect(spy).toHaveBeenCalled();
    return spy.calls.mostRecent().args[0];
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should leave the review email consent unchecked by default', () => {
    expect(component.repairForm.get('reviewEmailConsent')?.value).toBeFalse();
  });

  it('should stay valid when the review email consent is not given', () => {
    fillValidForm();

    expect(component.repairForm.get('reviewEmailConsent')?.value).toBeFalse();
    expect(component.repairForm.valid).toBeTrue();
  });

  it('should stay valid when the review email consent is given', () => {
    fillValidForm();
    component.repairForm.get('reviewEmailConsent')?.setValue(true);

    expect(component.repairForm.valid).toBeTrue();
  });

  it('should send reviewEmailConsent as false when the box is unchecked', () => {
    fillValidForm();

    expect(submitAndCaptureRequest().reviewEmailConsent).toBeFalse();
  });

  it('should send reviewEmailConsent as true when the box is checked', () => {
    fillValidForm();
    component.repairForm.get('reviewEmailConsent')?.setValue(true);

    expect(submitAndCaptureRequest().reviewEmailConsent).toBeTrue();
  });
});
