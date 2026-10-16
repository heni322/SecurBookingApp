import { parisParts, fromParis, daysInMonth, weekdayOf, sameParisDay } from '../parisTime';

describe('parisTime', () => {
  it('reads an instant on a Paris clock (summer, UTC+2)', () => {
    const p = parisParts(new Date('2026-10-08T06:00:00Z'));
    expect(p).toMatchObject({ year: 2026, month: 9, day: 8, hour: 8, minute: 0, weekday: 4 });
  });

  it('reads an instant on a Paris clock (winter, UTC+1)', () => {
    const p = parisParts(new Date('2026-12-24T23:30:00Z'));
    expect(p).toMatchObject({ year: 2026, month: 11, day: 25, hour: 0, minute: 30 });
  });

  it('builds the instant for a Paris wall time, whatever the phone zone', () => {
    // 08:00 in Paris on 8 Oct 2026 (CEST) = 06:00 UTC — the case found on the emulator.
    expect(fromParis(2026, 9, 8, 8, 0).toISOString()).toBe('2026-10-08T06:00:00.000Z');
    // 20:00 in Paris in winter = 19:00 UTC.
    expect(fromParis(2026, 11, 1, 20, 0).toISOString()).toBe('2026-12-01T19:00:00.000Z');
  });

  it('round-trips across both DST changes', () => {
    for (const [y, m, d, h] of [[2026, 2, 29, 1], [2026, 2, 29, 3], [2026, 9, 25, 1], [2026, 9, 25, 3]]) {
      const p = parisParts(fromParis(y, m, d, h, 15));
      expect([p.day, p.hour, p.minute]).toEqual([d, h, 15]);
    }
  });

  it('autumn repeated hour picks the earlier instant', () => {
    // 25 Oct 2026, 02:30 happens twice in Paris (00:30Z and 01:30Z).
    expect(fromParis(2026, 9, 25, 2, 30).toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('rolls over days and months like Date.UTC', () => {
    expect(parisParts(fromParis(2026, 9, 32, 9, 0))).toMatchObject({ month: 10, day: 1, hour: 9 });
  });

  it('calendar helpers do not depend on the phone zone', () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(weekdayOf(2026, 9, 7)).toBe(3); // Wednesday
    expect(sameParisDay(new Date('2026-10-07T22:30:00Z'), new Date('2026-10-08T05:00:00Z'))).toBe(true);
  });
});
