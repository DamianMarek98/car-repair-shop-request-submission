import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TeamService } from './team-service';
import { environment } from '../../environments/environment';

describe('TeamService', () => {
  const base = environment.apiUrl + '/internal/team/employees';
  let service: TeamService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TeamService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists employees for a year', () => {
    service.list(2027).subscribe();

    const request = http.expectOne(r => r.url === base);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('year')).toBe('2027');
    request.flush({ today: '2026-11-02', year: 2027, availableYears: [2026, 2027], employees: [] });
  });

  it('lists without a year param when none is given', () => {
    service.list().subscribe();

    const request = http.expectOne(r => r.url === base);
    expect(request.request.params.has('year')).toBeFalse();
    request.flush({ today: '2026-11-02', year: 2026, availableYears: [2026, 2027], employees: [] });
  });

  it('creates and updates with the command body', () => {
    const command = { firstName: 'Jan', lastName: 'Testowy', defaultAnnualDays: 20 };

    service.create(command).subscribe();
    const create = http.expectOne(base);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(command);
    create.flush({});

    service.update('id-1', command).subscribe();
    const update = http.expectOne(base + '/id-1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual(command);
    update.flush({});
  });

  it('sets a year pool, and clears it with null', () => {
    service.setPool('id-1', 2026, 9).subscribe();
    const set = http.expectOne(base + '/id-1/pool/2026');
    expect(set.request.method).toBe('PUT');
    expect(set.request.body).toEqual({ days: 9 });
    set.flush({});

    service.setPool('id-1', 2026, null).subscribe();
    const clear = http.expectOne(base + '/id-1/pool/2026');
    expect(clear.request.body).toEqual({ days: null });
    clear.flush({});
  });

  it('deletes by id', () => {
    service.delete('id-1').subscribe();

    const request = http.expectOne(base + '/id-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
