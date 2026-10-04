/**
 * Crash reporting in the client app (pre-launch audit 2026-10-02, H4).
 */
import type * as SentryModule from '../sentry';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  captureException: jest.fn(),
}));

const mockConfig = {
  features: { crashReporting: true },
  sentryDsn: 'https://key@o0.ingest.sentry.io/1',
  env: 'production',
  appVersion: '1.2.3',
};
jest.mock('@config', () => ({ config: mockConfig }));

interface SdkMock {
  init: jest.Mock;
  setUser: jest.Mock;
  setTag: jest.Mock;
  captureException: jest.Mock;
}

/** Fresh module state per test: `initSentry` starts at most once per load. */
function load(): { s: typeof SentryModule; sdk: SdkMock } {
  jest.resetModules();
  return {
    s: require('../sentry') as typeof SentryModule,
    sdk: require('@sentry/react-native') as SdkMock,
  };
}

describe('client sentry', () => {
  afterEach(() => {
    mockConfig.sentryDsn = 'https://key@o0.ingest.sentry.io/1';
    mockConfig.features.crashReporting = true;
  });

  it('stays off without a DSN, even with crash reporting on', () => {
    mockConfig.sentryDsn = '';
    const { s, sdk } = load();
    s.initSentry();
    s.captureHandledError(new Error('x'));
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it('stays off when crash reporting is disabled', () => {
    mockConfig.features.crashReporting = false;
    const { s, sdk } = load();
    s.initSentry();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('starts once, tagged with the app version and environment', () => {
    const { s, sdk } = load();
    s.initSentry();
    s.initSentry();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init.mock.calls[0][0]).toMatchObject({
      release: 'provalk-client@1.2.3',
      environment: 'production',
      sendDefaultPii: false,
    });
  });

  it('strips credentials and request bodies before sending', () => {
    const { s, sdk } = load();
    s.initSentry();
    const { beforeSend } = sdk.init.mock.calls[0][0];
    const event = beforeSend({
      request: {
        url: 'https://api/x?token=abc&page=2',
        headers: { Authorization: 'Bearer t' },
        data: { password: 'p' },
      },
    });
    expect(event.request.url).toBe('https://api/x?token=***&page=2');
    expect(event.request.headers.Authorization).toBeUndefined();
    expect(event.request.data).toBeUndefined();
  });

  it('sets only the user id and role', () => {
    const { s, sdk } = load();
    s.initSentry();
    s.setSentryUser({ id: 'u1', role: 'CLIENT' });
    expect(sdk.setUser).toHaveBeenCalledWith({ id: 'u1' });
    expect(sdk.setTag).toHaveBeenCalledWith('user_role', 'CLIENT');
  });
});
