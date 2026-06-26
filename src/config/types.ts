/**
 * config/types.ts — the typed shape of the app's runtime configuration.
 *
 * Every environment profile (development / staging / production) must satisfy
 * AppConfig in full. This is the single contract the rest of the app depends
 * on: screens and services import the resolved `config` object, never raw
 * string literals or process.env.
 */

/** The three supported build/runtime environments. */
export type AppEnv = 'development' | 'staging' | 'production';

/** Stripe publishable keys are environment-specific and never secret-side. */
export interface StripeConfig {
  /** Publishable key (pk_test_… in dev/staging, pk_live_… in prod). */
  readonly publishableKey: string;
  /** Optional Apple Pay merchant id; empty disables the Apple Pay button. */
  readonly merchantIdentifier: string;
}

export interface ApiConfig {
  /** Fully-qualified base URL including the /api/v1 prefix. */
  readonly baseUrl: string;
  /** Default request timeout in ms (uploads override locally). */
  readonly timeoutMs: number;
}

export interface MapsConfig {
  /** Raster tile template, {z}/{x}/{y}. */
  readonly tileUrlTemplate: string;
  /** Default country restriction for address search (ISO-3166 alpha-2). */
}

/** Cache freshness windows (ms) consumed by the React Query client. */
export interface CacheConfig {
  readonly staleShortMs: number;
  readonly staleMediumMs: number;
  readonly staleLongMs: number;
}

/**
 * Boolean toggles that vary by environment. Keep these minimal and meaningful —
 * a flag here should change real behaviour, not just hide a button.
 */
export interface FeatureFlags {
  /** Verbose axios/socket logging. ON in dev, OFF in staging/prod. */
  readonly debugLogging: boolean;
  /** Whether to surface developer-only screens/affordances. */
  readonly devMenu: boolean;
  /** Whether crash/error reporting (Sentry) should initialise. */
  readonly crashReporting: boolean;
}

export interface AppConfig {
  readonly env: AppEnv;
  /** Human display name (App Store / launcher label is native; this is in-app). */
  readonly appName: string;
  /** Marketing version, mirrors native CFBundleShortVersionString / versionName. */
  readonly appVersion: string;
  readonly api: ApiConfig;
  readonly stripe: StripeConfig;
  readonly maps: MapsConfig;
  readonly cache: CacheConfig;
  readonly features: FeatureFlags;
  /** Check-in tolerance radius in metres (GPS geofence). */
  readonly checkinRadiusMeters: number;
  /** Default page size for paginated lists. */
  readonly defaultPageSize: number;
  /** Sentry DSN; empty string disables Sentry even if crashReporting is true. */
  readonly sentryDsn: string;
}
