/**
 * constants/config.ts — BACKWARD-COMPATIBILITY SHIM.
 *
 * The single source of truth for configuration is now `@config` (src/config/*),
 * a typed, validated, environment-aware module. This file re-exports the legacy
 * named constants so existing imports keep working while the codebase migrates
 * to `import { config } from '@config'`.
 *
 * Prefer the new API in new code:
 *   import { config } from '@config';
 *   config.api.baseUrl, config.api.timeoutMs, config.cache.staleMediumMs, …
 *
 * These aliases are intentionally thin and may be removed once all call sites
 * use `@config` directly.
 */
import { config } from '@config';

/** @deprecated use `config.api.baseUrl` */
export const API_BASE_URL = config.api.baseUrl;

/** @deprecated use `config.api.timeoutMs` */
export const API_TIMEOUT = config.api.timeoutMs;

/** @deprecated use `config.defaultPageSize` */
export const DEFAULT_PAGE_SIZE = config.defaultPageSize;

/** @deprecated use `config.cache.*` */
export const STALE_TIME = {
  SHORT:  config.cache.staleShortMs,
  MEDIUM: config.cache.staleMediumMs,
  LONG:   config.cache.staleLongMs,
} as const;

/** @deprecated use `config.checkinRadiusMeters` */
export const CHECKIN_RADIUS_METERS = config.checkinRadiusMeters;

/** @deprecated use `config.appName` */
export const APP_NAME = config.appName;

/** @deprecated use `config.appVersion` */
export const APP_VERSION = config.appVersion;


// -- Document upload limits (added during enterprise migration) ----------------
// Used by useDocumentUpload + the upload service to reject oversized files
// client-side before they hit the network. Synced with the backend's
// PartnerDocumentsModule and KycModule max payload size.
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB
