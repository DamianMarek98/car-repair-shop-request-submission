export class StatusMapper {
    static mapStatus(status: string | undefined): string {
        if (!status) {
            return 'Brak';
        }
        if (status === 'NEW') {
          return 'Nowe';
        } else if (status === 'APPOINTMENT_MADE') {
          return 'Umówiono';
        } else if (status === 'HANDLED') {
          return 'Zakończono';
        }

        return 'NIEZNANY';
    }
}