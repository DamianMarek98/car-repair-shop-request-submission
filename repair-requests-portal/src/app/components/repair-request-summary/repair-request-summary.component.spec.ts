import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { RepairRequestSummaryComponent } from './repair-request-summary.component';
import { RepairRequestService } from '../../service/repair-request-service';
import { CloseRepairRequestResult } from '../../models/close-repair-request-result';
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

  describe('while an action is running', () => {
    function actionButton(): HTMLButtonElement {
      return fixture.nativeElement.querySelector('button.action-button');
    }

    it('should disable the button and show a spinner until the request finishes', () => {
      renderWith(repairRequest({ status: 'NEW' }));
      const pending = new Subject<void>();
      spyOn(repairRequestService, 'markRepairRequestAsHandled').and.returnValue(pending.asObservable());

      actionButton().click();
      fixture.detectChanges();

      expect(component.actionInProgress).toBeTrue();
      expect(actionButton().disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();

      pending.next();
      pending.complete();
      fixture.detectChanges();

      expect(component.actionInProgress).toBeFalse();
      expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
      expect(actionButton().disabled).toBeFalse();
    });

    it('should ignore repeated clicks while the first request is still in flight', () => {
      renderWith(repairRequest({ status: 'HANDLED', reviewEmailConsent: true }));
      const pending = new Subject<CloseRepairRequestResult>();
      const spy = spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
        .and.returnValue(pending.asObservable());

      actionButton().click();
      actionButton().click();
      component.markRepairRequestAsAppointmentMade();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should disable the review-email checkbox so the choice cannot change mid-flight', () => {
      renderWith(repairRequest({ status: 'HANDLED', reviewEmailConsent: true }));
      spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
        .and.returnValue(new Subject<CloseRepairRequestResult>().asObservable());

      actionButton().click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-checkbox input').disabled).toBeTrue();
    });

    it('should re-enable the button and warn when the action fails', () => {
      renderWith(repairRequest({ status: 'NEW' }));
      spyOn(repairRequestService, 'markRepairRequestAsHandled')
        .and.returnValue(throwError(() => new Error('network down')));

      component.markRepairRequestAsHandled();
      fixture.detectChanges();

      expect(component.actionInProgress).toBeFalse();
      expect(component.actionFailed).toBeTrue();
      expect(actionButton().disabled).toBeFalse();
      expect(fixture.nativeElement.textContent).toContain('Nie udało się wykonać akcji');
    });

    it('should not report a failure when only the refresh after a successful action fails', () => {
      renderWith(repairRequest({ status: 'HANDLED', reviewEmailConsent: true }));
      spyOn(repairRequestService, 'markRepairRequestAsAppointmentMade')
        .and.returnValue(of({ status: 'APPOINTMENT_MADE', reviewEmailSent: true }));
      (repairRequestService.getRepairRequest as jasmine.Spy)
        .and.returnValue(throwError(() => new Error('network down')));

      component.markRepairRequestAsAppointmentMade();

      expect(component.actionFailed).toBeFalse();
      expect(component.actionInProgress).toBeFalse();
    });

    it('should clear a previous failure when the action is retried', () => {
      renderWith(repairRequest({ status: 'NEW' }));
      component.actionFailed = true;
      spyOn(repairRequestService, 'markRepairRequestAsHandled')
        .and.returnValue(new Subject<void>().asObservable());

      component.markRepairRequestAsHandled();

      expect(component.actionFailed).toBeFalse();
    });
  });
});
