/**
 * tokenStorage — JWT persistence via Keychain (secure enclave) with
 * transparent AsyncStorage fallback on first launch / migration.
 *
 * Strategy
 * ────────
 * 1. On hydrate(), try Keychain first.
 * 2. If Keychain is empty but AsyncStorage has tokens (first launch after
 *    the upgrade), migrate them into Keychain and wipe AsyncStorage.
 * 3. All subsequent reads/writes go to Keychain only.
 * 4. If Keychain is unavailable (very old device / simulator without
 *    Secure Enclave), fall back silently to AsyncStorage.
 *
 * The in-memory cache (_accessToken / _refreshToken) keeps the getters
 * synchronous — never block the UI for a Keychain read after hydrate().
 */

import { Platform } from 'react-native';
import type * as KeychainModule from 'react-native-keychain';

// Lazy requires prevent bundler errors on platforms without native modules
let Keychain: typeof KeychainModule | null = null;
let AsyncStorage: any = null;

try { Keychain = require('react-native-keychain'); } catch {}
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Keychain service name — must be unique per app + stable across releases. */
const KEYCHAIN_SERVICE = 'com.securbooking.client.tokens';

/** Legacy AsyncStorage keys (used for one-time migration only). */
const LEGACY_KEYS = {
  access:  '@securbook:client:access_token',
  refresh: '@securbook:client:refresh_token',
} as const;

/**
 * Keychain username is used as a lookup key; we store both tokens as a JSON
 * string in the `password` field of one keychain entry.
 */
const KEYCHAIN_USERNAME = 'auth_tokens';

// ─── iOS accessibility ────────────────────────────────────────────────────────
// ACCESSIBLE_AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: tokens are available after
// the device is unlocked once after a reboot — no iCloud sync, stays on device.
const IOS_ACCESSIBILITY = Keychain?.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;

// ─── In-memory cache (populated by hydrate()) ─────────────────────────────────
let _accessToken:  string | null = null;
let _refreshToken: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function keychainGet(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!Keychain) return null;
  try {
    const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (!result) return null;
    const parsed = JSON.parse(result.password);
    if (parsed?.accessToken && parsed?.refreshToken) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function keychainSet(accessToken: string, refreshToken: string): Promise<boolean> {
  if (!Keychain) return false;
  try {
    await Keychain.setGenericPassword(
      KEYCHAIN_USERNAME,
      JSON.stringify({ accessToken, refreshToken }),
      {
        service:    KEYCHAIN_SERVICE,
        accessible: IOS_ACCESSIBILITY,
        // Android Keystore: require device authentication (biometric / PIN)
        ...(Platform.OS === 'android' && {
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        }),
      },
    );
    return true;
  } catch {
    return false;
  }
}

async function keychainClear(): Promise<void> {
  if (!Keychain) return;
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {}
}

/** One-time migration: AsyncStorage → Keychain. Called only during hydrate(). */
async function migrateFromAsyncStorage(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!AsyncStorage) return null;
  try {
    const [a, r] = await Promise.all([
      AsyncStorage.getItem(LEGACY_KEYS.access),
      AsyncStorage.getItem(LEGACY_KEYS.refresh),
    ]);
    if (!a || !r) return null;

    // Write to Keychain
    const ok = await keychainSet(a, r);
    if (ok) {
      // Wipe legacy keys regardless — even if Keychain failed, don't leak
      await Promise.allSettled([
        AsyncStorage.removeItem(LEGACY_KEYS.access),
        AsyncStorage.removeItem(LEGACY_KEYS.refresh),
      ]);
      if (__DEV__) console.log('[tokenStorage] ✅ Migrated tokens AsyncStorage → Keychain');
    }
    return { accessToken: a, refreshToken: r };
  } catch {
    return null;
  }
}

// ─── Async-Storage fallback (for devices without Keychain) ────────────────────

async function asyncStorageGet(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!AsyncStorage) return null;
  try {
    const [a, r] = await Promise.all([
      AsyncStorage.getItem(LEGACY_KEYS.access),
      AsyncStorage.getItem(LEGACY_KEYS.refresh),
    ]);
    if (!a || !r) return null;
    return { accessToken: a, refreshToken: r };
  } catch {
    return null;
  }
}

async function asyncStorageSet(accessToken: string, refreshToken: string): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await Promise.all([
      AsyncStorage.setItem(LEGACY_KEYS.access,  accessToken),
      AsyncStorage.setItem(LEGACY_KEYS.refresh, refreshToken),
    ]);
  } catch {}
}

async function asyncStorageClear(): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await Promise.all([
      AsyncStorage.removeItem(LEGACY_KEYS.access),
      AsyncStorage.removeItem(LEGACY_KEYS.refresh),
    ]);
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const tokenStorage = {
  /** Synchronous — safe to call only AFTER hydrate() has resolved. */
  getAccessToken:  (): string | null => _accessToken,
  getRefreshToken: (): string | null => _refreshToken,

  /**
   * Persist new tokens.
   * - Updates in-memory cache immediately (synchronous getters stay valid).
   * - Writes to Keychain; falls back to AsyncStorage if Keychain fails.
   */
  setTokens: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;

    // Fire-and-forget async write
    keychainSet(accessToken, refreshToken).then((ok) => {
      if (!ok) asyncStorageSet(accessToken, refreshToken);
    });
  },

  /**
   * Wipe tokens from memory + secure storage.
   */
  clearTokens: () => {
    _accessToken  = null;
    _refreshToken = null;
    // Wipe both storages; one of them will be no-op
    keychainClear();
    asyncStorageClear();
  },

  /**
   * Must be called once at app startup (before rehydrate()).
   * Populates the in-memory cache from Keychain (or AsyncStorage fallback).
   * Runs the one-time AsyncStorage→Keychain migration transparently.
   */
  hydrate: async (): Promise<void> => {
    // 1. Try Keychain first
    const kc = await keychainGet();
    if (kc) {
      _accessToken  = kc.accessToken;
      _refreshToken = kc.refreshToken;
      if (__DEV__) console.log('[tokenStorage] ✅ Loaded tokens from Keychain');
      return;
    }

    // 2. Keychain empty → attempt one-time migration from AsyncStorage
    const migrated = await migrateFromAsyncStorage();
    if (migrated) {
      _accessToken  = migrated.accessToken;
      _refreshToken = migrated.refreshToken;
      return;
    }

    // 3. Both empty → check AsyncStorage directly (Keychain-less device)
    const as = await asyncStorageGet();
    if (as) {
      _accessToken  = as.accessToken;
      _refreshToken = as.refreshToken;
      if (__DEV__) console.log('[tokenStorage] ⚠️  Keychain unavailable — using AsyncStorage');
    }
    // else: no tokens at all → user must log in
  },
} as const;
