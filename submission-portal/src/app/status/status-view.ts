import { parseLocalDay, parseUtc, toHoursAndMinutes } from '../commons/utc-date-time';
import { PreferredVisitWindow, RepairRequestStatus } from '../models/repair-request-status';

/** Chip colour set, see the `--st-*` tokens in styles.css. */
export type StatusPalette = 'warn' | 'ok' | 'done';

export interface StatusStep {
  label: string;
  done: boolean;
  /** The stage the request is at right now (the last one reached). */
  current: boolean;
  /** Connector halves are red only when both ends are done; `null` = no connector on that side. */
  lineLeftDone: boolean | null;
  lineRightDone: boolean | null;
}

export interface VisitWindowView {
  date: string;
  hours: string;
}

/** Everything the status page shows that is derived from the API response. */
export interface StatusView {
  chipLabel: string;
  palette: StatusPalette;
  headline: string;
  subline: string | null;
  steps: StatusStep[];
  completed: boolean;
  /** e.g. `14 wrz 2026` */
  submittedOn: string;
  windows: VisitWindowView[];
}

export const STEP_LABELS = ['Zgłoszenie przyjęte', 'Termin ustalony', 'Wizyta zakończona'];
export const ASAP_LABEL = 'Najszybciej jak się da';

interface StatusPresentation {
  chipLabel: string;
  palette: StatusPalette;
  /** How many of the three timeline steps are reached. */
  stepsDone: number;
  headline: (request: RepairRequestStatus) => string;
  subline: (request: RepairRequestStatus) => string | null;
}

/** One entry per backend status. Phase 3 adds RESCHEDULE_REQUESTED and CANCELLED here. */
const PRESENTATION = new Map<string, StatusPresentation>([
  ['NEW', {
    chipLabel: 'Nowe',
    palette: 'warn',
    stepsDone: 1,
    headline: () => 'Czekasz na kontakt z warsztatem',
    subline: () => 'Przyjęliśmy zgłoszenie. Odezwiemy się z propozycją terminu, zwykle w ciągu jednego dnia roboczego.'
  }],
  ['HANDLED', {
    chipLabel: 'Umówiono',
    palette: 'ok',
    stepsDone: 2,
    // requests booked before the workshop had to give a time have no appointmentAt
    headline: request => request.appointmentAt
      ? formatAppointment(parseUtc(request.appointmentAt))
      : 'Termin wizyty ustalony',
    subline: request => request.appointmentAt
      ? 'Prosimy o przyjazd 10 minut wcześniej — ul. Andrzeja Struga 8, Gdańsk.'
      : 'Szczegóły terminu potwierdzi warsztat.'
  }],
  ['APPOINTMENT_MADE', {
    chipLabel: 'Zakończono',
    palette: 'done',
    stepsDone: 3,
    headline: () => 'Wizyta zakończona',
    subline: request => request.completedAt ? formatLongDate(parseUtc(request.completedAt)) : null
  }]
]);

/** @returns `null` for a status this page does not know - the caller shows the error view. */
export function buildStatusView(request: RepairRequestStatus): StatusView | null {
  const presentation = PRESENTATION.get(request.status);
  if (!presentation) {
    return null;
  }
  return {
    chipLabel: presentation.chipLabel,
    palette: presentation.palette,
    headline: presentation.headline(request),
    subline: presentation.subline(request),
    steps: buildSteps(presentation.stepsDone),
    completed: request.status === 'APPOINTMENT_MADE',
    submittedOn: formatShortDate(parseUtc(request.submittedAt)),
    windows: buildWindows(request.asap, request.preferredVisitWindows)
  };
}

export function buildSteps(stepsDone: number): StatusStep[] {
  const done = STEP_LABELS.map((_, index) => index < stepsDone);
  return STEP_LABELS.map((label, index) => ({
    label,
    done: done[index],
    current: index === stepsDone - 1,
    lineLeftDone: index === 0 ? null : done[index - 1] && done[index],
    lineRightDone: index === STEP_LABELS.length - 1 ? null : done[index] && done[index + 1]
  }));
}

export function buildWindows(asap: boolean, windows: PreferredVisitWindow[] | null): VisitWindowView[] {
  if (asap) {
    return [{ date: ASAP_LABEL, hours: '' }];
  }
  return (windows ?? []).map(window => ({
    date: formatLongDate(parseLocalDay(window.date)),
    hours: formatHours(window.from, window.to)
  }));
}

export function formatHours(from: string | null, to: string | null): string {
  if (from && to) {
    return `${toHoursAndMinutes(from)} – ${toHoursAndMinutes(to)}`;
  }
  if (from) {
    return `od ${toHoursAndMinutes(from)}`;
  }
  if (to) {
    return `do ${toHoursAndMinutes(to)}`;
  }
  return 'dowolna godzina';
}

// Polish formatting through Intl instead of the app-wide LOCALE_ID, which stays untouched so the
// submission form keeps behaving as before. Built from parts so the shape is the same in every browser.
const APPOINTMENT_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const LONG_DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

function parts(format: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const result: Record<string, string> = {};
  format.formatToParts(date).forEach(part => result[part.type] = part.value);
  return result;
}

/** `środa, 23 września 2026, 09:00` in the browser's time zone. */
export function formatAppointment(date: Date): string {
  const p = parts(APPOINTMENT_FORMAT, date);
  return `${p['weekday']}, ${p['day']} ${p['month']} ${p['year']}, ${p['hour'].padStart(2, '0')}:${p['minute'].padStart(2, '0')}`;
}

/** `18 września 2026` */
export function formatLongDate(date: Date): string {
  const p = parts(LONG_DATE_FORMAT, date);
  return `${p['day']} ${p['month']} ${p['year']}`;
}

/** `14 wrz 2026` */
export function formatShortDate(date: Date): string {
  const p = parts(SHORT_DATE_FORMAT, date);
  return `${p['day']} ${p['month']} ${p['year']}`;
}
