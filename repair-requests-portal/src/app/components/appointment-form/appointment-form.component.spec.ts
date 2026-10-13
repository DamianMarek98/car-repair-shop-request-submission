import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AppointmentFormComponent } from './appointment-form.component';
import { UnavailableDaysService } from '../../service/unavailable-days-service';
import { toLocalDateString, toUtcDateTime } from '../../commons/utc-date-time';

describe('AppointmentFormComponent', () => {
  let component: AppointmentFormComponent;
  let fixture: ComponentFixture<AppointmentFormComponent>;
  const unavailableDay = nextWorkingDay(14);

  /** A Monday-Friday day at least `daysAhead` days from today (local time). */
  function nextWorkingDay(daysAhead: number): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + daysAhead);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  function create(appointmentAt: string | null = null): void {
    fixture = TestBed.createComponent(AppointmentFormComponent);
    component = fixture.componentInstance;
    component.appointmentAt = appointmentAt;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentFormComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: UnavailableDaysService,
          useValue: { getAll: () => of([{ id: 'id', date: toLocalDateString(unavailableDay) }]) }
        }
      ]
    }).compileComponents();
  });

  it('should emit the chosen local date and time as a UTC timestamp', () => {
    create();
    const day = nextWorkingDay(7);
    const emitted: string[] = [];
    component.appointmentSubmitted.subscribe(value => emitted.push(value));

    component.form.setValue({ date: day, time: '09:30' });
    component.submit();

    expect(emitted).toEqual([toUtcDateTime(day, '09:30')]);
  });

  it('should accept any minute between 08:00 and 16:00 inclusive', () => {
    create();
    const time = component.form.controls.time;

    ['08:00', '10:37', '16:00'].forEach(value => {
      time.setValue(value);
      expect(time.valid).withContext(value).toBeTrue();
    });
    ['07:59', '16:01'].forEach(value => {
      time.setValue(value);
      expect(time.hasError('openingHours')).withContext(value).toBeTrue();
    });
  });

  it('should not emit without a date or time', () => {
    create();
    const spy = spyOn(component.appointmentSubmitted, 'emit');

    component.submit();

    expect(spy).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should not emit a time that has already passed', () => {
    create();
    const spy = spyOn(component.appointmentSubmitted, 'emit');
    const today = new Date();
    component.form.setValue({ date: today, time: '08:00' });
    // make 08:00 today certainly past, regardless of when the test runs
    spyOn(Date, 'now').and.returnValue(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59).getTime());

    component.submit();

    expect(spy).not.toHaveBeenCalled();
    expect(component.inPast).toBeTrue();
  });

  it('should block weekends and unavailable days in the date picker', () => {
    create();
    const saturday = nextWorkingDay(7);
    saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));

    expect(component.dateFilter(saturday)).toBeFalse();
    expect(component.dateFilter(unavailableDay)).toBeFalse();
    expect(component.dateFilter(nextWorkingDay(7))).toBeTrue();
  });

  it('should pre-fill the current appointment in local time', () => {
    const day = nextWorkingDay(7);
    create(toUtcDateTime(day, '13:15'));

    expect(toLocalDateString(component.form.value.date!)).toBe(toLocalDateString(day));
    expect(component.form.value.time).toBe('13:15');
  });

  it('should emit cancel when changing an appointment is abandoned', () => {
    create();
    component.cancellable = true;
    fixture.detectChanges();
    const spy = spyOn(component.cancelled, 'emit');

    const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelector('button.cancel-button');
    cancelButton.click();

    expect(spy).toHaveBeenCalled();
  });
});
