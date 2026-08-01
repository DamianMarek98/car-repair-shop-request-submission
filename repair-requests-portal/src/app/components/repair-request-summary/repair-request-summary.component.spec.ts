import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { RepairRequestSummaryComponent } from './repair-request-summary.component';
import { RepairRequestService } from '../../service/repair-request-service';
import { RepairRequest } from '../../models/repair-request';

describe('RepairRequestSummaryComponent', () => {
  let component: RepairRequestSummaryComponent;
  let fixture: ComponentFixture<RepairRequestSummaryComponent>;
  let repairRequestService: RepairRequestService;

  function repairRequest(overrides: Partial<RepairRequest> = {}): RepairRequest {
    return {
      id: 'request-id',
      vin: '4Y1SL65848Z411439',
      plateNumber: 'GD12345',
      issueDescription: 'nie dziala klimatyzacja',
      submitterFirstName: 'Damian',
      submitterLastName: 'Marek',
      email: 'test@test.com',
      phoneNumber: '111222333',
      asap: true,
      reviewEmailConsent: false,
      reviewEmailSentAt: null,
      preferredVisitWindows: [],
      submittedAt: '2026-07-01T10:00:00',
      handledAt: '2026-07-02T10:00:00',
      status: 'HANDLED',
      ...overrides
    };
  }

  function renderWith(request: RepairRequest): void {
    spyOn(repairRequestService, 'getRepairRequest').and.returnValue(of(request));
    component.id = request.id;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepairRequestSummaryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([])
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RepairRequestSummaryComponent);
    component = fixture.componentInstance;
    repairRequestService = TestBed.inject(RepairRequestService);
  });

  it('should create', () => {
    renderWith(repairRequest());

    expect(component).toBeTruthy();
  });

  it('should show a pre-checked checkbox when the customer consented', () => {
    renderWith(repairRequest({ reviewEmailConsent: true }));

    const checkbox = fixture.nativeElement.querySelector('mat-checkbox input');
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBeTrue();
    expect(component.canSendReviewEmail()).toBeTrue();
  });

  it('should show no checkbox but an explanatory note when consent is missing', () => {
    renderWith(repairRequest({ reviewEmailConsent: false }));

    expect(fixture.nativeElement.querySelector('mat-checkbox')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Klient nie wyraził zgody');
    expect(component.canSendReviewEmail()).toBeFalse();
  });

  it('should ask for the e-mail when consent is present and the box stays checked', () => {
    renderWith(repairRequest({ reviewEmailConsent: true }));
    const spy = spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
      .and.returnValue(of({ status: 'APPOINTMENT_MADE', reviewEmailSent: true }));

    component.markRepairRequestAsAppointmentMade();

    expect(spy).toHaveBeenCalledWith('request-id', true);
    expect(component.reviewEmailFailed).toBeFalse();
  });

  it('should not ask for the e-mail when the receptionist unchecks the box', () => {
    renderWith(repairRequest({ reviewEmailConsent: true }));
    const spy = spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
      .and.returnValue(of({ status: 'APPOINTMENT_MADE', reviewEmailSent: false }));
    component.sendReviewEmail = false;

    component.markRepairRequestAsAppointmentMade();

    expect(spy).toHaveBeenCalledWith('request-id', false);
    expect(component.reviewEmailFailed).toBeFalse();
  });

  it('should never ask for the e-mail when consent is missing', () => {
    renderWith(repairRequest({ reviewEmailConsent: false }));
    const spy = spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
      .and.returnValue(of({ status: 'APPOINTMENT_MADE', reviewEmailSent: false }));

    component.markRepairRequestAsAppointmentMade();

    expect(spy).toHaveBeenCalledWith('request-id', false);
  });

  it('should warn when the e-mail was requested but not sent', () => {
    renderWith(repairRequest({ reviewEmailConsent: true }));
    spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
      .and.returnValue(of({ status: 'APPOINTMENT_MADE', reviewEmailSent: false }));

    component.markRepairRequestAsAppointmentMade();
    fixture.detectChanges();

    expect(component.reviewEmailFailed).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('nie udało się wysłać e-maila');
  });

  it('should show when the review e-mail was already sent', () => {
    renderWith(repairRequest({
      reviewEmailConsent: true,
      reviewEmailSentAt: '2026-07-03T10:00:00',
      status: 'APPOINTMENT_MADE'
    }));

    expect(fixture.nativeElement.textContent).toContain('wysłano');
  });
});
