import { StatusMapper } from './status-mapper';

describe('StatusMapper', () => {
  describe('mapStatus', () => {
    it('maps NEW to "Nowe"', () => {
      expect(StatusMapper.mapStatus('NEW')).toBe('Nowe');
    });

    it('maps APPOINTMENT_MADE to "Umówiono"', () => {
      expect(StatusMapper.mapStatus('APPOINTMENT_MADE')).toBe('Umówiono');
    });

    it('maps HANDLED to "Zakończono"', () => {
      expect(StatusMapper.mapStatus('HANDLED')).toBe('Zakończono');
    });

    it('returns "Brak" for undefined status', () => {
      expect(StatusMapper.mapStatus(undefined)).toBe('Brak');
    });

    it('returns "NIEZNANY" for an unknown status', () => {
      expect(StatusMapper.mapStatus('SOMETHING_ELSE')).toBe('NIEZNANY');
    });
  });

  describe('mapStatusToChipClass', () => {
    it('returns the new chip class for NEW', () => {
      expect(StatusMapper.mapStatusToChipClass('NEW')).toBe('status-chip--new');
    });

    it('returns the appointment chip class for APPOINTMENT_MADE', () => {
      expect(StatusMapper.mapStatusToChipClass('APPOINTMENT_MADE')).toBe('status-chip--appointment');
    });

    it('returns the handled chip class for HANDLED', () => {
      expect(StatusMapper.mapStatusToChipClass('HANDLED')).toBe('status-chip--handled');
    });

    it('returns the unknown chip class for undefined status', () => {
      expect(StatusMapper.mapStatusToChipClass(undefined)).toBe('status-chip--unknown');
    });

    it('returns the unknown chip class for an unknown status', () => {
      expect(StatusMapper.mapStatusToChipClass('SOMETHING_ELSE')).toBe('status-chip--unknown');
    });
  });

  describe('mapStatusToRowColor', () => {
    it('returns an amber tint for NEW', () => {
      expect(StatusMapper.mapStatusToRowColor('NEW')).toBe('#ffe39e');
    });

    it('returns a green tint for APPOINTMENT_MADE', () => {
      expect(StatusMapper.mapStatusToRowColor('APPOINTMENT_MADE')).toBe('#aee3bd');
    });

    it('returns a grey tint for HANDLED', () => {
      expect(StatusMapper.mapStatusToRowColor('HANDLED')).toBe('#d3dae0');
    });

    it('returns a valid neutral colour for undefined status', () => {
      expect(StatusMapper.mapStatusToRowColor(undefined)).toBe('transparent');
    });

    it('returns a valid neutral colour for an unknown status', () => {
      expect(StatusMapper.mapStatusToRowColor('SOMETHING_ELSE')).toBe('transparent');
    });
  });
});
