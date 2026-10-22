import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LeaveService } from './leave-service';
import { environment } from '../../environments/environment';

describe('LeaveService', () => {
  const base = environment.apiUrl + '/internal/team/leaves';
  let service: LeaveService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LeaveService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for a date range', () => {
    service.inRange('2026-10-26', '2026-12-06').subscribe();

    const request = http.expectOne(r => r.url === base);
    expect(request.request.params.get('from')).toBe('2026-10-26');
    expect(request.request.params.get('to')).toBe('2026-12-06');
    expect(request.request.params.has('employeeId')).toBeFalse();
    request.flush([]);
  });

  it('asks for one employee and year', () => {
    service.forEmployee('e-1', 2026).subscribe();

    const request = http.expectOne(r => r.url === base);
    expect(request.request.params.get('employeeId')).toBe('e-1');
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.has('from')).toBeFalse();
    request.flush([]);
  });

  it('creates and updates with the command body', () => {
    const command = { employeeId: 'e-1', startDate: '2026-11-09', endDate: '2026-11-13' };

    service.create(command).subscribe();
    const create = http.expectOne(base);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(command);
    create.flush({ leave: {}, balance: [], warnings: [] });

    service.update('l-1', { startDate: '2026-11-09', endDate: '2026-11-10' }).subscribe();
    const update = http.expectOne(base + '/l-1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ startDate: '2026-11-09', endDate: '2026-11-10' });
    update.flush({ leave: {}, balance: [], warnings: [] });
  });

  it('deletes by id', () => {
    service.delete('l-1').subscribe();

    const request = http.expectOne(base + '/l-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
