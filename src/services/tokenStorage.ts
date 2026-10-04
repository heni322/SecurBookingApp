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

// ─── Storage backend reporting ───────────────────────────────────────────────
// Which backend actually holds the tokens. Exposed so the app can report it to
// crash/analytics tooling: a silent downgrade to plaintext is exactly the kind
// of thing nobody discovers until an incident.
export type StorageBackend =
  | 'unknown'
  | 'keychain-hardware'
  | 'keychain-software'
  | 'async-storage-plaintext';

let _backend: StorageBackend = 'unknown';
let _warnedAboutPlaintext = false;

type DegradeListener = (backend: StorageBackend, reason: string) => void;
let _onDegrade: DegradeListener | null = null;

function setBackend(backend: StorageBackend, reason: string) {
  const changed = _backend !== backend;
  _backend = backend;

  if (backend === 'async-storage-plaintext' && !_warnedAboutPlaintext) {
    _warnedAboutPlaintext = true;
    // console.warn, not __DEV__-gated: this must be visible in release builds
    // too, because it is the case that actually matters.
    console.warn(
      `[tokenStorage] Secure storage unavailable (${reason}) — JWTs are being ` +
        'stored in AsyncStorage in PLAINTEXT, readable by any process on a ' +
        'rooted/jailbroken device.',
    );
  }
  if (changed && _onDegrade) {
    try {
      _onDegrade(backend, reason);
    } catch {
      /* a telemetry hook must never break auth */
    }
  }
}

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

/**
 * Persist both tokens in one Keychain entry.
 *
 * SECURITY FIX (audit 2026-08, P1-2). The previous implementation requested
 * `SECURITY_LEVEL.SECURE_HARDWARE` on Android inside a `try { … } catch { return
 * false; }`. On any device without a hardware-backed keystore — common on
 * budget and older Android hardware — that request THROWS, the throw was
 * swallowed, and the caller fell straight through to writing both JWTs into
 * AsyncStorage in plaintext. Silently, with no signal, on an unknown share of
 * the install base.
 *
 * The fix is a ladder rather than a single attempt: hardware-backed keystore
 * first, then the software keystore (still OS-encrypted, still far better than
 * plaintext), and only then the caller's plaintext fallback — which now
 * announces itself.
 */
async function keychainSet(accessToken: string, refreshToken: string): Promise<boolean> {
  if (!Keychain) {
    setBackend('async-storage-plaintext', 'react-native-keychain not installed');
    return false;
  }

  const payload = JSON.stringify({ accessToken, refreshToken });

  const attempts: Array<{
    level?: KeychainModule.SECURITY_LEVEL;
    backend: StorageBackend;
    label: string;
  }> =
    Platform.OS === 'android'
      ? [
          {
            level: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
            backend: 'keychain-hardware',
            label: 'hardware keystore',
          },
          {
            level: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
            backend: 'keychain-software',
            label: 'software keystore',
          },
        ]
      : [{ backend: 'keychain-hardware', label: 'iOS keychain' }];

  let lastError = 'unknown error';

  for (const attempt of attempts) {
    try {
      await Keychain.setGenericPassword(KEYCHAIN_USERNAME, payload, {
        service: KEYCHAIN_SERVICE,
        accessible: IOS_ACCESSIBILITY,
        ...(attempt.level ? { securityLevel: attempt.level } : {}),
      });
      setBackend(attempt.backend, attempt.label);
      return true;
    } catch (e: any) {
      lastError = e?.message ?? String(e);
      // Fall through to the next, weaker attempt.
    }
  }

  setBackend('async-storage-plaintext', lastError);
  return false;
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

    // NOTE: the legacy keys are wiped ONLY when the Keychain write succeeded.
    // A previous comment here claimed they were wiped "regardless", which would
    // have been wrong: on a device where Keychain is unavailable, deleting the
    // AsyncStorage copy is the only copy, and the user is silently logged out.
    // The plaintext-storage risk on those devices is reported via setBackend()
    // instead of being papered over by data loss.
    const ok = await keychainSet(a, r);
    if (ok) {
      await Promise.allSettled([
        AsyncStorage.removeItem(LEGACY_KEYS.access),
        AsyncStorage.removeItem(LEGACY_KEYS.refresh),
      ]);
      if (__DEV__) console.log('[tokenStorage] Migrated tokens AsyncStorage -> Keychain');
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
   * - Writes to Keychain; falls back to AsyncStorage if every Keychain
   *   attempt fails.
   *
   * FIX (audit 2026-08, P1-3): this used to be fire-and-forget. The backend
   * rotates refresh tokens, so the old refresh token is already dead the moment
   * a refresh succeeds. If the app was killed in the window between the
   * in-memory update and the disk write, the persisted refresh token was the
   * dead one — producing a forced logout on next cold start with no
   * diagnosable cause. Callers must now await this.
   */
  setTokens: async ({
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken: string;
  }): Promise<void> => {
    _accessToken = accessToken;
    _refreshToken = refreshToken;

    const ok = await keychainSet(accessToken, refreshToken);
    if (!ok) await asyncStorageSet(accessToken, refreshToken);
  },

  /**
   * Wipe tokens from memory + secure storage.
   *
   * Also awaited (P1-3): a logout that returns before the wipe completes can
   * leave credentials on disk if the process dies, which is the one moment the
   * user explicitly asked for them to be gone.
   */
  clearTokens: async (): Promise<void> => {
    _accessToken = null;
    _refreshToken = null;
    // Wipe both storages; one of them will be a no-op.
    await Promise.allSettled([keychainClear(), asyncStorageClear()]);
  },

  /**
   * Which backend currently holds the tokens. Report this to crash/analytics
   * tooling at startup: 'async-storage-plaintext' means this device is storing
   * JWTs unencrypted, and without measurement you cannot know how large that
   * slice of the install base is.
   */
  getStorageBackend: (): StorageBackend => _backend,

  /**
   * Register a one-off listener fired whenever the effective storage backend
   * changes — intended for wiring into Sentry/analytics once a DSN exists.
   */
  onStorageDegraded: (listener: DegradeListener | null): void => {
    _onDegrade = listener;
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
      // A successful Keychain read proves secure storage works on this device;
      // the precise level is only known on write, so report the safe generic.
      setBackend('keychain-software', 'tokens loaded from Keychain');
      if (__DEV__) console.log('[tokenStorage] Loaded tokens from Keychain');
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
      // Record the reality: these tokens are sitting in plaintext. Doing this
      // on read (not only on write) means the backend is reported correctly
      // from app start, before any refresh happens.
      setBackend('async-storage-plaintext', 'tokens loaded from AsyncStorage');
    }
    // else: no tokens at all → user must log in
  },
} as const;
