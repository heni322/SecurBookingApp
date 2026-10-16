import { buildPrestationRows } from '../QuoteBreakdownCard';

const svc = (id: string, name: string, rate: string) => ({ id, name, baseRatePerHour: rate });
const booking = (serviceType: any, slotId: string, status = 'OPEN') =>
  ({ serviceTypeId: serviceType.id, serviceType, slotId, status }) as any;

describe('quote lines (2026-10-07)', () => {
  const ads = svc('ads', 'Agent de Sécurité (ADS)', '19');
  const k9  = svc('k9', 'Maître-Chien (Cynophile)', '22');
  const slots = [{ id: 's1', startAt: '2026-10-22T07:00:00Z', endAt: '2026-10-22T19:00:00Z' }];

  it('adds up exactly to the base HT (the device case: 492 € of lines vs 908,23 € base)', () => {
    const rows = buildPrestationRows([booking(ads, 's1'), booking(k9, 's1')], 12, 908.23, slots);
    const sum = Math.round(rows.reduce((a, r) => a + r.subtotal, 0) * 100) / 100;
    expect(sum).toBe(908.23);
    // Shared by weight 19×12 : 22×12.
    expect(rows[0].subtotal).toBeCloseTo(908.23 * 19 / 41, 1);
    expect(rows[0].hours).toBe(12);
  });

  it('uses each post\'s own slot length on multi-slot missions', () => {
    const two = [...slots, { id: 's2', startAt: '2026-10-23T18:00:00Z', endAt: '2026-10-24T00:00:00Z' }]; // 12 h + 6 h
    const rows = buildPrestationRows([booking(ads, 's1'), booking(ads, 's2')], 18, 540, two);
    expect(rows).toHaveLength(1);
    expect(rows[0].agentCount).toBe(2);
    expect(rows[0].subtotal).toBe(540);
    expect(rows[0].ratePerHour).toBeCloseTo(30, 5); // 540 € / 18 agent-hours
  });

  it('ignores cancelled posts', () => {
    const rows = buildPrestationRows([booking(ads, 's1'), booking(k9, 's1', 'CANCELLED')], 12, 300, slots);
    expect(rows.map(r => r.serviceTypeId)).toEqual(['ads']);
    expect(rows[0].subtotal).toBe(300);
  });
});
