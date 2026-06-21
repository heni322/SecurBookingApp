/**
 * @config — single entry point for app configuration.
 *
 * Usage:
 *   import { config, isProd } from '@config';
 *   axios.create({ baseURL: config.api.baseUrl, timeout: config.api.timeoutMs });
 */
export { config, isDev, isStaging, isProd } from './env';
export type { AppConfig, AppEnv } from './types';
export type {
  ApiConfig,
  StripeConfig,
  MapsConfig,
  CacheConfig,
  FeatureFlags,
} from './types';
