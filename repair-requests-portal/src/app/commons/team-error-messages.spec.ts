import { HttpErrorResponse } from '@angular/common/http';
import { GENERIC_TEAM_ERROR, TEAM_ERROR_MESSAGES, teamErrorMessage, teamErrorMessageForCode } from './team-error-messages';

describe('team-error-messages', () => {
  // every code the shop's TeamErrorCode can return (phases 1-2)
  const BACKEND_CODES = ['EMPLOYEE_NOT_FOUND', 'INVALID_NAME', 'INVALID_POOL', 'INVALID_YEAR', 'LEAVE_NOT_FOUND',
    'INVALID_RANGE', 'NO_WORKING_DAYS', 'TOO_FAR_AHEAD', 'LEAVE_OVERLAP', 'EMPLOYEE_CHANGE_NOT_ALLOWED',
    'INVALID_QUERY'];

  it('has a message for every backend code', () => {
    for (const code of BACKEND_CODES) {
      expect(TEAM_ERROR_MESSAGES[code]).withContext(code).toBeTruthy();
    }
  });

  it('maps a known code', () => {
    expect(teamErrorMessageForCode('LEAVE_OVERLAP')).toBe('Pracownik ma już urlop w tym terminie.');
  });

  it('falls back for unknown or missing codes', () => {
    expect(teamErrorMessageForCode('SOMETHING_NEW')).toBe(GENERIC_TEAM_ERROR);
    expect(teamErrorMessageForCode(undefined)).toBe(GENERIC_TEAM_ERROR);
  });

  it('reads the code from an API error body', () => {
    const error = new HttpErrorResponse({ status: 400, error: { code: 'INVALID_POOL', message: 'x' } });

    expect(teamErrorMessage(error)).toBe(TEAM_ERROR_MESSAGES['INVALID_POOL']);
  });

  it('falls back for errors without a code body', () => {
    expect(teamErrorMessage(new HttpErrorResponse({ status: 500, error: 'boom' }))).toBe(GENERIC_TEAM_ERROR);
    expect(teamErrorMessage(new Error('network'))).toBe(GENERIC_TEAM_ERROR);
  });
});
