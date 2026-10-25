import { HttpErrorResponse } from '@angular/common/http';

/**
 * Polish copy for the team API's error codes (shop `TeamErrorCode`). Keep the keys in sync with
 * the backend enum - an unknown code falls back to a generic message.
 */
export const TEAM_ERROR_MESSAGES: Record<string, string> = {
  EMPLOYEE_NOT_FOUND: 'Nie znaleziono pracownika. Odśwież stronę.',
  INVALID_NAME: 'Imię i nazwisko muszą mieć od 1 do 60 znaków.',
  INVALID_POOL: 'Pula urlopu musi być liczbą całkowitą od 0 do 365.',
  INVALID_YEAR: 'Nieprawidłowy rok.',
  INVALID_MEDICAL_EXAM_DATE: 'Data ważności badań lekarskich musi być w przyszłości (najpóźniej za 10 lat).',
  INVALID_BHP_TRAINING_DATE: 'Data ważności szkolenia BHP musi być w przyszłości (najpóźniej za 10 lat).',
  LEAVE_NOT_FOUND: 'Nie znaleziono urlopu. Odśwież stronę.',
  INVALID_RANGE: 'Nieprawidłowy zakres dat: koniec nie może być przed początkiem, a urlop nie może trwać dłużej niż 60 dni.',
  NO_WORKING_DAYS: 'Wybrany zakres obejmuje tylko weekend.',
  TOO_FAR_AHEAD: 'Urlop można planować najdalej do końca przyszłego roku.',
  LEAVE_OVERLAP: 'Pracownik ma już urlop w tym terminie.',
  EMPLOYEE_CHANGE_NOT_ALLOWED: 'Urlopu nie można przenieść na innego pracownika. Usuń go i dodaj nowy.',
  INVALID_QUERY: 'Nieprawidłowe zapytanie.',
};

export const GENERIC_TEAM_ERROR = 'Coś poszło nie tak. Spróbuj ponownie.';

export function teamErrorMessageForCode(code: string | null | undefined): string {
  return (code && TEAM_ERROR_MESSAGES[code]) || GENERIC_TEAM_ERROR;
}

/** Message for a failed team API call (`{ code, message }` body) or anything else thrown. */
export function teamErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return teamErrorMessageForCode(error.error.code);
  }
  return GENERIC_TEAM_ERROR;
}
