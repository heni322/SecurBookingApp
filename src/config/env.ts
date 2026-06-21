/**
 * config/env.ts — resolves, validates and freezes the active AppConfig.
 *
 * This is the ONLY place that decides which environment profile is live, and the
 * ONLY module the rest of the app imports configuration from:
 *
 *     import { config } from '@config';
 *     axios.create({ baseURL: config.api.baseUrl });
 *
 * Environment selection
 * ──────────────────────
 * 1. If a global __APP_ENV__ is injected (e.g. by a build script / babel define)
 *    and is one of the known envs, it wins. This lets a RELEASE build target
 *    staging without code edits.
 * 2. Otherwise: __DEV__ → 'development', else → 'production'.
 *
 * To build a staging release without an injected global, change
 * RELEASE_ENV_OVERRIDE below to 'staging' for that build, or wire __APP_ENV__
 * via your CI. Keeping this explicit avoids a hidden dependency on a native
 * config lib the project doesn't currently use.
 */
import { ENVIRONMENTS } from './environments';
import type { AppConfig, AppEnv } from './types';

// Optional global injected at build time (CI / babel transform / index.js).
// Declared loosely so TS doesn't require it to exist.
declare const __APP_ENV__: string | undefined;

/**
 * For non-dev builds, the default target. Set to 'staging' in a staging build
 * pipeline, or leave 'production' for store releases. An injected __APP_ENV__
 * always takes precedence over this.
 */
const RELEASE_ENV_OVERRIDE: AppEnv = 'production';

const KNOWN_ENVS: readonly AppEnv[] = ['development', 'staging', 'production'];

function isAppEnv(v: unknown): v is AppEnv {
  return typeof v === 'string' && (KNOWN_ENVS as readonly string[]).includes(v);
}

function resolveEnv(): AppEnv {
  // 1. Injected global wins (build-time selection).
  try {
    if (typeof __APP_ENV__ !== 'undefined' && isAppEnv(__APP_ENV__)) {
      return __APP_ENV__;
    }
  } catch {
    /* __APP_ENV__ not defined — fall through */
  }
  // 2. __DEV__ → development; otherwise the release override.
  // eslint-disable-next-line no-undef
  if (typeof __DEV__ !== 'undefined' && __DEV__) return 'development';
  return RELEASE_ENV_OVERRIDE;
}

/**
 * Validate a resolved config. Throws in development (fail fast, loud) and only
 * warns in staging/production (never hard-crash a shipped app over a config
 * lint — the app should still boot and surface a clear console error).
 */
function validate(cfg: AppConfig): void {
  const problems: string[] = [];

  if (!/^https?:\/\//.test(cfg.api.baseUrl)) {
    problems.push(`api.baseUrl is not a valid URL: "${cfg.api.baseUrl}"`);
  }
  if (cfg.env === 'production') {
    if (!cfg.api.baseUrl.startsWith('https://')) {
      problems.push('production api.baseUrl must use https://');
    }
    if (!cfg.stripe.publishableKey.startsWith('pk_live_')) {
      problems.push('production Stripe key must start with pk_live_');
    }
    if (cfg.stripe.publishableKey.includes('REMPLACER')) {
      problems.push('production Stripe publishableKey is still a placeholder');
    }
  }
  if (cfg.env !== 'production' && cfg.stripe.publishableKey.startsWith('pk_live_')) {
    problems.push(`${cfg.env} must not use a LIVE Stripe key`);
  }

  if (problems.length === 0) return;

  const msg =
    `[config] Invalid configuration for env="${cfg.env}":\n` +
    problems.map(p => `  • ${p}`).join('\n');

  // Fail fast in development so mistakes are caught immediately; in shipped
  // builds, log loudly but let the app boot.
  // eslint-disable-next-line no-undef
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    throw new Error(msg);
  } else {
    console.error(msg);
  }
}

const activeEnv = resolveEnv();
const resolved = ENVIRONMENTS[activeEnv];

validate(resolved);

/** The frozen, validated, active configuration. */
export const config: AppConfig = Object.freeze(resolved);

/** Convenience env predicates. */
export const isDev = config.env === 'development';
export const isStaging = config.env === 'staging';
export const isProd = config.env === 'production';

export type { AppConfig, AppEnv } from './types';
