/**
 * config.test.ts — verifies the config module resolves, validates and freezes.
 *
 * In the jest/RN preset, __DEV__ is true, so env.ts resolves to the
 * 'development' profile. These assertions lock in the contract the rest of the
 * app relies on and prove the @config alias + module load correctly.
 */
import { config, isDev, isProd } from '@config';

describe('@config', () => {
  it('resolves to the development profile under jest (__DEV__ = true)', () => {
    expect(config.env).toBe('development');
    expect(isDev).toBe(true);
    expect(isProd).toBe(false);
  });

  it('exposes a valid API base URL with the /api/v1 prefix', () => {
    expect(config.api.baseUrl).toMatch(/^https?:\/\//);
    expect(config.api.baseUrl).toContain('/api/v1');
    expect(config.api.timeoutMs).toBeGreaterThan(0);
  });

  it('never uses a LIVE Stripe key outside production', () => {
    expect(config.stripe.publishableKey.startsWith('pk_live_')).toBe(false);
  });

  it('provides cache windows in ascending order', () => {
    expect(config.cache.staleShortMs).toBeLessThan(config.cache.staleMediumMs);
    expect(config.cache.staleMediumMs).toBeLessThan(config.cache.staleLongMs);
  });

  it('exposes maps endpoints and a descriptive Nominatim User-Agent', () => {
    expect(config.maps.nominatimUrl).toMatch(/^https:\/\//);
    expect(config.maps.tileUrlTemplate).toContain('{z}/{x}/{y}');
    expect(config.maps.nominatimUserAgent.length).toBeGreaterThan(0);
  });

  it('is deeply frozen (immutable at the top level)', () => {
    expect(Object.isFrozen(config)).toBe(true);
    expect(() => {
      // @ts-expect-error — intentional mutation attempt
      config.env = 'production';
    }).toThrow();
  });
});
