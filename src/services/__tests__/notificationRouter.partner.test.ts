/**
 * Partner notification routing (2026-10-07): a mission notification opens the
 * mission itself when it names one, contract ones open the contracts list.
 */
jest.mock('@store/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { role: 'PARTNER' }, isLoggedIn: true }) },
}));

import { resolveNotificationAction } from '../notificationRouter';

const target = (a: any) => a?.payload?.params;

describe('partner notification routing', () => {
  it('opens the mission detail when the notification names a mission', () => {
    const p = target(resolveNotificationAction({ type: 'BOOKING_CHECKIN', missionId: 'm1' }));
    expect(p).toMatchObject({ screen: 'PartnerHome', params: { screen: 'PartnerMissionDetail', params: { missionId: 'm1' } } });
  });

  it('falls back to the missions list without a mission id', () => {
    const p = target(resolveNotificationAction({ type: 'BOOKING_CHECKIN' }));
    expect(p).toMatchObject({ screen: 'PartnerHome', params: { screen: 'PartnerMissions' } });
  });

  it('opens the contracts list for contract notifications', () => {
    const p = target(resolveNotificationAction({ type: 'CONTRACT_FULLY_SIGNED', missionId: 'm1' }));
    expect(p).toMatchObject({ screen: 'PartnerHome', params: { screen: 'PartnerContracts' } });
  });
});
