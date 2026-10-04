/**
 * Single-flight token refresh — regression cover for P1-4 (audit 2026-08).
 *
 * There used to be two independent refresh paths:
 *   • the axios response interceptor (guarded by its own `isRefreshing` flag)
 *   • the exported `refreshAccessToken()`, used by uploadService, which streams
 *     multipart uploads over raw XHR and therefore bypasses interceptors
 *
 * Each serialised only itself. The backend rotates refresh tokens, so when both
 * fired at once the second call presented a token the first had already
 * invalidated — its refresh failed and the user was logged out mid-session. A
 * document upload running alongside normal API traffic is exactly that case.
 *
 * These tests assert the invariant that fixes it: however many callers ask,
 * only ONE refresh request is ever in flight.
 */

jest.mock('@config', () => ({
  config: {
    api: { baseUrl: 'https://api.test/api/v1', timeoutMs: 1000 },
    features: { debugLogging: false },
  },
}));

jest.mock('@services/socketService', () => ({
  socketService: { reconnect: jest.fn(), disconnect: jest.fn() },
}));

jest.mock('@services/navigationRef', () => ({ resetToRoot: jest.fn() }));

jest.mock('@store/authStore', () => ({
  useAuthStore: {
    setState: jest.fn(),
    getState: jest.fn(() => ({ logout: jest.fn() })),
  },
}));

// Must be `mock`-prefixed: jest hoists jest.mock() factories above imports and
// only permits out-of-scope references matching that prefix.
const mockSetTokens = jest.fn().mockResolvedValue(undefined);
jest.mock('@services/tokenStorage', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(() => 'stale-access'),
    getRefreshToken: jest.fn(() => 'refresh-1'),
    setTokens: (...args: unknown[]) => mockSetTokens(...args),
  },
}));

jest.mock('axios', () => {
  const post = jest.fn();
  return {
    __esModule: true,
    default: {
      post,
      create: () => ({
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      }),
    },
  };
});

import axios from 'axios';
import { refreshAccessToken } from '../src/api/client';

const mockedPost = axios.post as jest.Mock;

/** A refresh that resolves only when we say so, to hold the window open. */
function deferredRefresh() {
  let release!: () => void;
  const gate = new Promise<void>(res => {
    release = res;
  });
  mockedPost.mockImplementation(async () => {
    await gate;
    return { data: { data: { accessToken: 'new-access', refreshToken: 'refresh-2' } } };
  });
  return release;
}

describe('refreshAccessToken — single flight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues ONE refresh request for concurrent callers', async () => {
    const release = deferredRefresh();

    // Two callers overlap — e.g. an upload 401 and a normal request 401.
    const a = refreshAccessToken();
    const b = refreshAccessToken();

    release();
    const [tokenA, tokenB] = await Promise.all([a, b]);

    // The invariant. Two POSTs here would mean the second presented a refresh
    // token the first had already rotated away.
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(tokenA).toBe('new-access');
    expect(tokenB).toBe('new-access');
  });

  it('persists the rotated pair exactly once', async () => {
    const release = deferredRefresh();

    const all = Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);
    release();
    await all;

    expect(mockSetTokens).toHaveBeenCalledTimes(1);
    expect(mockSetTokens).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'refresh-2',
    });
  });

  it('starts a fresh request once the previous one has settled', async () => {
    mockedPost.mockResolvedValue({
      data: { data: { accessToken: 'new-access', refreshToken: 'refresh-2' } },
    });

    await refreshAccessToken();
    await refreshAccessToken();

    // Sequential calls are NOT deduplicated — the in-flight promise must be
    // released on settle, or the app would keep serving a stale token forever.
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it('releases the in-flight slot after a failure so retries can proceed', async () => {
    mockedPost.mockRejectedValueOnce(new Error('network'));

    await expect(refreshAccessToken()).rejects.toThrow('network');

    mockedPost.mockResolvedValue({
      data: { data: { accessToken: 'new-access', refreshToken: 'refresh-2' } },
    });

    // A latched promise would leave the app permanently unable to refresh.
    await expect(refreshAccessToken()).resolves.toBe('new-access');
  });
});
