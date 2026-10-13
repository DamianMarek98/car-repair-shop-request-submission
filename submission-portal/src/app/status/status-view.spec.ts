import { RepairRequestStatus } from '../models/repair-request-status';
import {
  ASAP_LABEL, buildStatusView, buildSteps, buildWindows, formatAppointment, formatHours, formatLongDate,
  formatShortDate
} from './status-view';

/** A local wall-clock time as the backend would send it: UTC, no offset. */
function utc(local: Date): string {
  return local.toISOString().slice(0, 19);
}

function request(overrides: Partial<RepairRequestStatus> = {}): RepairRequestStatus {
  return {
    status: 'NEW',
    submitterFirstName: 'Anna',
    plateNumber: 'GD12345',
    vin: '***…11439',
    phoneNumber: '••• ••• 567',
    email: 'a••••@example.com',
    issueDescription: 'Stuka zawieszenie',
    asap: false,
    preferredVisitWindows: [],
    submittedAt: utc(new Date(2026, 8, 14, 19, 42)),
    appointmentAt: null,
    completedAt: null,
    ...overrides
  };
}

describe('status-view', () => {
  describe('date formatting', () => {
    it('should format an appointment in Polish with weekday and 24h time', () => {
      expect(formatAppointment(new Date(2026, 8, 23, 9, 0))).toBe('środa, 23 września 2026, 09:00');
      expect(formatAppointment(new Date(2026, 10, 2, 15, 5))).toBe('poniedziałek, 2 listopada 2026, 15:05');
    });

    it('should format a long and a short date in Polish', () => {
      expect(formatLongDate(new Date(2026, 8, 18))).toBe('18 września 2026');
      expect(formatShortDate(new Date(2026, 8, 14))).toBe('14 wrz 2026');
    });
  });

  describe('visit window hours', () => {
    it('should describe all four from/to combinations', () => {
      expect(formatHours('08:00:00', '12:00:00')).toBe('08:00 – 12:00');
      expect(formatHours('08:00:00', null)).toBe('od 08:00');
      expect(formatHours(null, '12:00:00')).toBe('do 12:00');
      expect(formatHours(null, null)).toBe('dowolna godzina');
    });

    it('should show the windows on their local calendar days', () => {
      const windows = buildWindows(false, [
        { date: '2026-11-02', from: '09:00:00', to: '12:00:00' },
        { date: '2026-11-03', from: null, to: null }
      ]);

      expect(windows).toEqual([
        { date: '2 listopada 2026', hours: '09:00 – 12:00' },
        { date: '3 listopada 2026', hours: 'dowolna godzina' }
      ]);
    });

    it('should show a single "as soon as possible" entry instead of windows', () => {
      const windows = buildWindows(true, [{ date: '2026-11-02', from: '09:00:00', to: '12:00:00' }]);

      expect(windows).toEqual([{ date: ASAP_LABEL, hours: '' }]);
    });

    it('should have nothing to show without windows', () => {
      expect(buildWindows(false, [])).toEqual([]);
      expect(buildWindows(false, null)).toEqual([]);
    });
  });

  describe('timeline', () => {
    it('should mark only the first step for a new request', () => {
      const steps = buildSteps(1);

      expect(steps.map(step => step.done)).toEqual([true, false, false]);
      expect(steps.map(step => step.current)).toEqual([true, false, false]);
      expect(steps.map(step => step.lineLeftDone)).toEqual([null, false, false]);
      expect(steps.map(step => step.lineRightDone)).toEqual([false, false, null]);
    });

    it('should colour a connector only between two reached steps', () => {
      const steps = buildSteps(2);

      expect(steps.map(step => step.done)).toEqual([true, true, false]);
      expect(steps.map(step => step.current)).toEqual([false, true, false]);
      expect(steps.map(step => step.lineLeftDone)).toEqual([null, true, false]);
      expect(steps.map(step => step.lineRightDone)).toEqual([true, false, null]);
    });

    it('should mark every step once the visit is done', () => {
      const steps = buildSteps(3);

      expect(steps.map(step => step.done)).toEqual([true, true, true]);
      expect(steps.map(step => step.current)).toEqual([false, false, true]);
    });
  });

  describe('per status', () => {
    it('should present a new request', () => {
      const view = buildStatusView(request())!;

      expect(view.chipLabel).toBe('Nowe');
      expect(view.palette).toBe('warn');
      expect(view.headline).toBe('Czekasz na kontakt z warsztatem');
      expect(view.subline).toContain('Przyjęliśmy zgłoszenie');
      expect(view.steps.map(step => step.done)).toEqual([true, false, false]);
      expect(view.completed).toBeFalse();
      expect(view.submittedOn).toBe('14 wrz 2026');
    });

    it('should show the appointment in browser time as the headline of a booked request', () => {
      const view = buildStatusView(request({
        status: 'HANDLED',
        appointmentAt: utc(new Date(2026, 8, 23, 9, 0))
      }))!;

      expect(view.chipLabel).toBe('Umówiono');
      expect(view.palette).toBe('ok');
      expect(view.headline).toBe('środa, 23 września 2026, 09:00');
      expect(view.subline).toBe('Prosimy o przyjazd 10 minut wcześniej — ul. Andrzeja Struga 8, Gdańsk.');
      expect(view.steps.map(step => step.done)).toEqual([true, true, false]);
    });

    it('should cope with a booked request that has no appointment time', () => {
      const view = buildStatusView(request({ status: 'HANDLED', appointmentAt: null }))!;

      expect(view.headline).toBe('Termin wizyty ustalony');
      expect(view.subline).toBe('Szczegóły terminu potwierdzi warsztat.');
    });

    it('should present a completed request with its completion date', () => {
      const view = buildStatusView(request({
        status: 'APPOINTMENT_MADE',
        completedAt: utc(new Date(2026, 8, 18, 15, 48)) + '.390794'
      }))!;

      expect(view.chipLabel).toBe('Zakończono');
      expect(view.palette).toBe('done');
      expect(view.headline).toBe('Wizyta zakończona');
      expect(view.subline).toBe('18 września 2026');
      expect(view.steps.map(step => step.done)).toEqual([true, true, true]);
      expect(view.completed).toBeTrue();
    });

    it('should leave out the subline of a completed request without a completion date', () => {
      const view = buildStatusView(request({ status: 'APPOINTMENT_MADE', completedAt: null }))!;

      expect(view.subline).toBeNull();
    });

    it('should not present a status it does not know', () => {
      expect(buildStatusView(request({ status: 'SOMETHING_NEW' }))).toBeNull();
      expect(buildStatusView(request({ status: 'toString' }))).toBeNull();
    });
  });
});
