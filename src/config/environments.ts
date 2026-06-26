/**
 * config/environments.ts — the three concrete environment profiles.
 *
 * Design
 * ───────
 * • `shared` holds everything identical across environments (cache windows,
 *   maps endpoints, page size, geofence radius).
 * • Each profile spreads `shared` and overrides ONLY what differs (API host,
 *   Stripe key, feature flags, Sentry DSN).
 * • Nothing here is secret: publishable Stripe keys and public URLs only. The
 *   secret-side keys (sk_…, whsec_…) live on the backend and never ship in the
 *   app bundle.
 *
 * How values get here
 * ────────────────────
 * For a bare React Native app without react-native-config, the cleanest
 * dependency-free approach is to keep the non-secret values in source (they are
 * not secret) and select the active profile via APP_ENV at resolve time
 * (see ./env.ts). If you later add react-native-config or EAS, read the same
 * fields from process.env there and these literals become the fallback.
 */
import type { AppConfig, AppEnv } from './types';

// ── Shared, environment-independent defaults ──────────────────────────────────
const shared = {
  appName: 'Provalk',
  appVersion: '1.0.0',
  maps: {
    tileUrlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  cache: {
    staleShortMs: 2 * 60 * 1000,
    staleMediumMs: 5 * 60 * 1000,
    staleLongMs: 10 * 60 * 1000,
  },
  checkinRadiusMeters: 30,
  defaultPageSize: 20,
} as const;

/**
 * DEV_HOST — the machine the Metro/dev API runs on. Strategy:
 *   • USB:        adb reverse tcp:3000 tcp:3000  → use 'localhost'
 *   • Wi-Fi:      your machine's LAN IP (e.g. '192.168.1.12')
 *   • Emulator:   Android emulator loopback      → '10.0.2.2'
 * Must also be whitelisted in android network_security_config.xml (debug).
 */
const DEV_HOST = '192.168.45.94';

// ── Profiles ──────────────────────────────────────────────────────────────────
export const ENVIRONMENTS: Record<AppEnv, AppConfig> = {
  development: {
    ...shared,
    env: 'development',
    api: {
      baseUrl: `http://${DEV_HOST}:3000/api/v1`,
      timeoutMs: 15_000,
    },
    stripe: {
      // Replace with your real Stripe TEST publishable key.
      publishableKey: 'pk_test_REMPLACER_PAR_VOTRE_CLE_TEST_STRIPE',
      merchantIdentifier: '',
    },
    features: {
      debugLogging: true,
      devMenu: true,
      crashReporting: false,
    },
    sentryDsn: '',
  },

  staging: {
    ...shared,
    env: 'staging',
    appName: 'Provalk (Staging)',
    api: {
      // Point this at your staging API once it exists.
      baseUrl: 'https://api-staging.securbooking.com/api/v1',
      timeoutMs: 15_000,
    },
    stripe: {
      // Staging uses TEST keys so no real charges occur.
      publishableKey: 'pk_test_REMPLACER_PAR_VOTRE_CLE_TEST_STRIPE',
      merchantIdentifier: '',
    },
    features: {
      debugLogging: true,
      devMenu: false,
      crashReporting: true,
    },
    // Use a separate Sentry project/environment for staging.
    sentryDsn: '',
  },

  production: {
    ...shared,
    env: 'production',
    api: {
      baseUrl: 'https://api.securbooking.com/api/v1',
      timeoutMs: 15_000,
    },
    stripe: {
      // Replace with your real Stripe LIVE publishable key before release.
      publishableKey: 'pk_live_REMPLACER_PAR_VOTRE_CLE_LIVE_STRIPE',
      merchantIdentifier: 'merchant.com.securbookingapp',
    },
    features: {
      debugLogging: false,
      devMenu: false,
      crashReporting: true,
    },
    sentryDsn: '',
  },
};
