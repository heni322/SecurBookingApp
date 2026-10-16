import { isTodayInParis, parisDay, stepForApiKey } from '../missionCreate';

describe('isTodayInParis', () => {
  // 2026-10-07 22:30 UTC = 00:30 on the 8th in Paris (CEST, UTC+2).
  const now = new Date('2026-10-07T22:30:00Z');

  it('uses the Paris calendar, not UTC or the device clock', () => {
    expect(parisDay(now)).toBe('2026-10-08');
    expect(isTodayInParis('2026-10-07T23:45:00Z', now)).toBe(true);  // 01:45 Paris, 8th
    expect(isTodayInParis('2026-10-07T21:00:00Z', now)).toBe(false); // 23:00 Paris, 7th
  });

  it('handles empty and invalid input', () => {
    expect(isTodayInParis('', now)).toBe(false);
    expect(isTodayInParis('not a date', now)).toBe(false);
  });
});

describe('stepForApiKey', () => {
  it('routes location errors to step 1', () => {
    expect(stepForApiKey('missions.errors.location_incoherent')).toBe(1);
  });

  it('routes schedule / staffing errors to step 2', () => {
    for (const k of [
      'missions.errors.slots_overlap',
      'missions.errors.first_slot_too_soon',
      'missions.errors.slot_duration_maximum',
      'missions.errors.service_type_unavailable',
      'missions.errors.duplicate_service_line',
      'missions.errors.no_booking_lines',
    ]) {
      expect(stepForApiKey(k)).toBe(2);
    }
  });

  it('returns null when no step can fix it', () => {
    expect(stepForApiKey('missions.errors.client_not_found')).toBeNull();
    expect(stepForApiKey('')).toBeNull();
    expect(stepForApiKey(undefined)).toBeNull();
  });
});
