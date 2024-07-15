export class StatusMapper {
    static mapStatus(status: string | undefined): string {
        if (!status) {
            return 'Brak';
        }
        if (status === 'NEW') {
          return 'Nowe';
        } else if (status === 'APPOINTMENT_MADE') {
          return 'Zakończono';
        } else if (status === 'HANDLED') {
          return 'Umówiono';
        }

        return 'NIEZNANY';
    }

    static mapStatusToColor(status: string | undefined): string {
      if (!status) {
          return 'Brak';
      }
      if (status === 'NEW') {
        return '#95f0fc';
      } else if (status === 'APPOINTMENT_MADE') {
        return '#009933';
      } else if (status === 'HANDLED') {
        return '#e0e0d1';
      }

      return 'NIEZNANY';
  }
}