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

    /** CSS class for the status chip/badge (see .status-chip rules in styles.css). */
    static mapStatusToChipClass(status: string | undefined): string {
      if (status === 'NEW') {
        return 'status-chip--new';
      } else if (status === 'APPOINTMENT_MADE') {
        return 'status-chip--appointment';
      } else if (status === 'HANDLED') {
        return 'status-chip--handled';
      }

      return 'status-chip--unknown';
    }

    /** Softened background tint applied to a table row to convey status at a glance. */
    static mapStatusToRowColor(status: string | undefined): string {
      if (!status) {
          return 'transparent';
      }
      if (status === 'NEW') {
        return '#ffe39e';
      } else if (status === 'APPOINTMENT_MADE') {
        return '#aee3bd';
      } else if (status === 'HANDLED') {
        return '#d3dae0';
      }

      return 'transparent';
  }
}
