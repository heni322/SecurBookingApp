/**
 * tokenStorage — JWT persistence via AsyncStorage.
 * Synchronous getters use an in-memory cache populated on app start.
 */

let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const KEYS = {
  access:  '@securbook:client:access_token',
  refresh: '@securbook:client:refresh_token',
};

let _accessToken:  string | null = null;
let _refreshToken: string | null = null;

export const tokenStorage = {
  // Synchronous — use after hydrate()
  getAccessToken:  (): string | null => _accessToken,
  getRefreshToken: (): string | null => _refreshToken,

  setTokens: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;
    AsyncStorage?.setItem(KEYS.access,  accessToken).catch(() => {});
    AsyncStorage?.setItem(KEYS.refresh, refreshToken).catch(() => {});
  },

  clearTokens: () => {
    _accessToken  = null;
    _refreshToken = null;
    AsyncStorage?.removeItem(KEYS.access).catch(() => {});
    AsyncStorage?.removeItem(KEYS.refresh).catch(() => {});
  },

  hydrate: async (): Promise<void> => {
    if (!AsyncStorage) return;
    try {
      const [a, r] = await Promise.all([
        AsyncStorage.getItem(KEYS.access),
        AsyncStorage.getItem(KEYS.refresh),
      ]);
      _accessToken  = a ?? null;
      _refreshToken = r ?? null;
    } catch {}
  },
};
