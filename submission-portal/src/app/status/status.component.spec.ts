import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { StatusComponent } from './status.component';
import { RepairRequestStatus } from '../models/repair-request-status';
import { environment } from '../../environments/environment';

describe('StatusComponent', () => {
  const TOKEN = '6cCU0c9ucsNcOij_M05dpCNSGM2M3nIRIdloHUQzP0Q';
  const STATUS_URL = environment.apiUrl + '/public/repair-request/status/' + TOKEN;

  let fixture: ComponentFixture<StatusComponent>;
  let http: HttpTestingController;

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
      issueDescription: 'Stuka zawieszenie\nprzy hamowaniu',
      asap: false,
      preferredVisitWindows: [
        { date: '2026-11-02', from: '09:00:00', to: '12:00:00' },
        { date: '2026-11-03', from: '10:00:00', to: null }
      ],
      submittedAt: utc(new Date(2026, 8, 14, 19, 42)),
      appointmentAt: null,
      completedAt: null,
      ...overrides
    };
  }

  async function create(token: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [StatusComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap(token === null ? {} : { token })) }
        }
      ]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Title).setTitle('RENO CAR - Umów się');
    fixture = TestBed.createComponent(StatusComponent);
    fixture.detectChanges();
  }

  async function render(response: RepairRequestStatus): Promise<void> {
    await create(TOKEN);
    http.expectOne(STATUS_URL).flush(response);
    fixture.detectChanges();
  }

  function page(): HTMLElement {
    return fixture.nativeElement;
  }

  function text(selector: string): string {
    return page().querySelector(selector)?.textContent?.trim() ?? '';
  }

  function stepStates(): boolean[] {
    return Array.from(page().querySelectorAll('.step')).map(step => step.classList.contains('step--done'));
  }

  afterEach(() => http.verify());

  describe('a new request', () => {
    beforeEach(async () => render(request()));

    it('should show the "Nowe" chip, the waiting headline and only the first step reached', () => {
      expect(text('.chip')).toBe('Nowe');
      expect(page().querySelector('.chip')!.classList).toContain('chip--warn');
      expect(text('h1')).toBe('Czekasz na kontakt z warsztatem');
      expect(text('.subline')).toContain('Przyjęliśmy zgłoszenie');
      expect(stepStates()).toEqual([true, false, false]);
      expect(page().querySelector('.step[aria-current="step"]')!.textContent).toContain('Zgłoszenie przyjęte');
    });

    it('should name the page "Twoje zgłoszenie" and say when it was submitted', () => {
      expect(text('.header-title')).toBe('Twoje zgłoszenie');
      expect(text('.header-meta')).toContain('zgłoszono 14 wrz 2026');
    });

    it('should show masked personal data exactly as the API sent it', () => {
      const details = text('app-status-details');

      expect(details).toContain('***…11439');
      expect(details).toContain('••• ••• 567');
      expect(details).toContain('a••••@example.com');
      expect(details).toContain('GD12345');
      expect(details).toContain('Anna');
    });

    it('should show the description and the preferred visit windows', () => {
      expect(text('.description')).toBe('Stuka zawieszenie\nprzy hamowaniu');
      const windows = Array.from(page().querySelectorAll('.window')).map(window => window.textContent!.trim());

      expect(windows.length).toBe(2);
      expect(windows[0]).toContain('2 listopada 2026');
      expect(windows[0]).toContain('09:00 – 12:00');
      expect(windows[1]).toContain('3 listopada 2026');
      expect(windows[1]).toContain('od 10:00');
    });

    it('should offer a phone contact and nothing that changes the request', () => {
      expect(page().querySelector('.contact a[href="tel:585201914"]')).toBeTruthy();
      expect(text('.contact-text')).toContain('chcesz zmienić termin');
      // reschedule / cancel / edit / messages are not part of the read-only page
      expect(page().querySelectorAll('button').length).toBe(0);
      expect(page().querySelector('textarea, input')).toBeNull();
      const content = page().textContent!;
      ['Wiadomości', 'Edytuj', 'Odwołaj', 'Zmień termin', 'Zgoda na e-mail'].forEach(label =>
        expect(content).not.toContain(label));
    });

    it('should have exactly one main heading', () => {
      expect(page().querySelectorAll('h1').length).toBe(1);
    });
  });

  describe('a booked request', () => {
    it('should show the appointment in the browser time zone as the headline', async () => {
      await render(request({ status: 'HANDLED', appointmentAt: utc(new Date(2026, 8, 23, 9, 0)) }));

      expect(text('.chip')).toBe('Umówiono');
      expect(page().querySelector('.chip')!.classList).toContain('chip--ok');
      expect(text('h1')).toBe('środa, 23 września 2026, 09:00');
      expect(text('.subline')).toBe('Prosimy o przyjazd 10 minut wcześniej — ul. Andrzeja Struga 8, Gdańsk.');
      expect(stepStates()).toEqual([true, true, false]);
      expect(page().querySelector('.step[aria-current="step"]')!.textContent).toContain('Termin ustalony');
      expect(page().querySelector('.banner')).toBeNull();
    });
  });

  describe('a completed request', () => {
    it('should show the completion date, all steps reached and the thank-you note', async () => {
      await render(request({
        status: 'APPOINTMENT_MADE',
        appointmentAt: utc(new Date(2026, 8, 18, 9, 0)),
        completedAt: utc(new Date(2026, 8, 18, 15, 48)) + '.390794'
      }));

      expect(text('.chip')).toBe('Zakończono');
      expect(page().querySelector('.chip')!.classList).toContain('chip--done');
      expect(text('h1')).toBe('Wizyta zakończona');
      expect(text('.subline')).toBe('18 września 2026');
      expect(stepStates()).toEqual([true, true, true]);
      expect(text('.banner')).toContain('Dziękujemy za wizytę');
      // most customers prefer to call, so the phone number comes first, the contact page second
      const bannerLinks = Array.from(page().querySelectorAll('.banner a')).map(link => link.getAttribute('href'));
      expect(bannerLinks).toEqual(['tel:585201914', 'https://renocar.pl/kontakt/']);
      expect(text('.banner')).toContain('Zadzwoń pod (58) 520-19-14');
      // owner, 2026-10-13: no invoice by e-mail (the mockup promised one) - repair details are
      // given by phone and when the car is returned
      expect(text('.banner')).toContain('telefonicznie oraz przy odbiorze samochodu');
      expect(text('.banner')).not.toContain('Faktur');
      expect(text('.banner')).not.toContain('e-mailem');
    });

    it('should not suggest changing the date of a visit that already happened', async () => {
      await render(request({ status: 'APPOINTMENT_MADE', completedAt: utc(new Date(2026, 8, 18, 15, 48)) }));

      expect(text('.contact-text')).toBe('Masz pytanie? Zadzwoń do nas.');
    });
  });

  describe('optional data', () => {
    it('should hide rows the request has no value for', async () => {
      await render(request({ vin: null, plateNumber: null }));

      const labels = Array.from(page().querySelectorAll('dt')).map(label => label.textContent);
      expect(labels).not.toContain('VIN');
      expect(labels).not.toContain('Numer rejestracyjny');
      expect(labels).toContain('Zgłaszający');
    });

    it('should show "as soon as possible" instead of visit windows', async () => {
      await render(request({ asap: true, preferredVisitWindows: [] }));

      const windows = page().querySelectorAll('.window');
      expect(windows.length).toBe(1);
      expect(windows[0].textContent!.trim()).toBe('Najszybciej jak się da');
    });

    it('should hide the visit windows section when there are none', async () => {
      await render(request({ asap: false, preferredVisitWindows: [] }));

      expect(page().textContent).not.toContain('Preferowane terminy wizyty');
    });
  });

  describe('when the link does not work', () => {
    it('should show the "link invalid" view for a 404', async () => {
      await create(TOKEN);
      http.expectOne(STATUS_URL).flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(text('h1')).toBe('Link wygasł lub jest nieprawidłowy');
      expect(text('.header-title')).toBe('Status zgłoszenia');
      expect(page().querySelector('.state-card a[href="tel:585201914"]')).toBeTruthy();
      expect(page().querySelector('.state-card a[href="/"]')!.textContent).toContain('owe zgłoszenie');
      expect(page().querySelector('app-status-details')).toBeNull();
    });

    it('should not call the API for a token of the wrong shape', async () => {
      await create('too-short');

      expect(text('h1')).toBe('Link wygasł lub jest nieprawidłowy');
      http.expectNone(() => true);
    });

    it('should not call the API for a token with illegal characters', async () => {
      await create('6cCU0c9ucsNcOij_M05dpCNSGM2M3nIRIdloHUQzP0!');

      expect(text('h1')).toBe('Link wygasł lub jest nieprawidłowy');
      http.expectNone(() => true);
    });

    it('should not call the API without a token', async () => {
      await create(null);

      expect(text('h1')).toBe('Link wygasł lub jest nieprawidłowy');
      http.expectNone(() => true);
    });
  });

  describe('when loading fails', () => {
    it('should show a loading note while the request is in flight', async () => {
      await create(TOKEN);

      expect(text('.state-card')).toContain('Wczytujemy zgłoszenie');
      expect(page().querySelector('.spinner')).toBeTruthy();

      http.expectOne(STATUS_URL).flush(request());
    });

    it('should show the error view, not "link invalid", for a server error', async () => {
      await create(TOKEN);
      http.expectOne(STATUS_URL).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(text('h1')).toBe('Nie udało się wczytać zgłoszenia');
      expect(page().textContent).not.toContain('Link wygasł');
      expect(page().querySelector('.state-card a[href="tel:585201914"]')).toBeTruthy();
    });

    it('should show the error view when the network is down', async () => {
      await create(TOKEN);
      http.expectOne(STATUS_URL).error(new ProgressEvent('error'));
      fixture.detectChanges();

      expect(text('h1')).toBe('Nie udało się wczytać zgłoszenia');
    });

    it('should fetch again on "Spróbuj ponownie"', async () => {
      await create(TOKEN);
      http.expectOne(STATUS_URL).flush('boom', { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();

      (page().querySelector('.state-card button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(text('.state-card')).toContain('Wczytujemy zgłoszenie');

      http.expectOne(STATUS_URL).flush(request());
      fixture.detectChanges();
      expect(text('h1')).toBe('Czekasz na kontakt z warsztatem');
    });

    it('should show the error view for a status this page does not know', async () => {
      await render(request({ status: 'SOMETHING_NEW' }));

      expect(text('h1')).toBe('Nie udało się wczytać zgłoszenia');
      expect(page().querySelector('app-status-summary')).toBeNull();
    });
  });

  describe('page metadata', () => {
    it('should set its own title and keep the page out of search engines', async () => {
      await create(TOKEN);
      http.expectOne(STATUS_URL).flush(request());

      expect(TestBed.inject(Title).getTitle()).toBe('Status zgłoszenia — RENO CAR');
      expect(TestBed.inject(Meta).getTag('name="robots"')!.content).toBe('noindex,nofollow');
    });

    it('should give the title back and drop the robots tag when leaving', async () => {
      await create(TOKEN);
      http.expectOne(STATUS_URL).flush(request());

      fixture.destroy();

      expect(TestBed.inject(Title).getTitle()).toBe('RENO CAR - Umów się');
      expect(TestBed.inject(Meta).getTag('name="robots"')).toBeNull();
    });
  });
});
