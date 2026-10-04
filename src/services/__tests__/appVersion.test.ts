/**
 * Minimum app version handling (pre-launch audit 2026-10-02, H9).
 */
import {
  APP_ID,
  appVersionHeaders,
  checkVersionPolicy,
  isOlderThan,
  reportUpdateRequired,
  updateRequirementFrom,
} from '../appVersion';
import { useAppUpdateStore } from '@store/appUpdateStore';

describe('appVersion', () => {
  beforeEach(() => useAppUpdateStore.setState({ required: null }));

  it('identifies the app on every request', () => {
    expect(appVersionHeaders()).toMatchObject({
      'x-app-name': APP_ID,
      'x-app-version': expect.stringMatching(/^\d+\.\d+/),
    });
  });

  it('compares versions numerically', () => {
    expect(isOlderThan('1.9.0', '1.10.0')).toBe(true);
    expect(isOlderThan('1.10.0', '1.9.0')).toBe(false);
    expect(isOlderThan('1.2', '1.2.0')).toBe(false);
    expect(isOlderThan('1.0.0', null)).toBe(false);
    expect(isOlderThan('dev', '1.0.0')).toBe(false);
  });

  it('only treats a 426 APP_UPDATE_REQUIRED body as an update requirement', () => {
    expect(updateRequirementFrom(426, { code: 'APP_UPDATE_REQUIRED', minVersion: '2.0.0', storeUrl: 'https://x' }))
      .toEqual({ minVersion: '2.0.0', storeUrl: 'https://x' });
    expect(updateRequirementFrom(426, { code: 'OTHER' })).toBeNull();
    expect(updateRequirementFrom(400, { code: 'APP_UPDATE_REQUIRED' })).toBeNull();
  });

  it('raises the blocking state from a 426', () => {
    expect(reportUpdateRequired(426, { code: 'APP_UPDATE_REQUIRED', minVersion: '9.0.0', storeUrl: '' })).toBe(true);
    expect(useAppUpdateStore.getState().required).toEqual({ minVersion: '9.0.0', storeUrl: null });
  });

  it('checks the published policy at launch', async () => {
    await checkVersionPolicy(() => Promise.resolve({
      data: { [APP_ID]: { minVersion: '999.0.0', storeUrls: { android: 'https://a', ios: 'https://i' } } },
    }));
    expect(useAppUpdateStore.getState().required?.minVersion).toBe('999.0.0');
  });

  it('does nothing when the build is current or the policy cannot be read', async () => {
    await checkVersionPolicy(() => Promise.resolve({ data: { [APP_ID]: { minVersion: '0.0.1' } } }));
    await checkVersionPolicy(() => Promise.reject(new Error('offline')));
    expect(useAppUpdateStore.getState().required).toBeNull();
  });
});
