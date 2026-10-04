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

  it('exposes the OSM tile URL template', () => {
    // Geocoding moved to the backend (BAN/Géoplateforme); the app only keeps the
    // tile URL template for the Leaflet map layer.
    expect(config.maps.tileUrlTemplate).toContain('{z}/{x}/{y}');
  });

  it('is deeply frozen (immutable at the top level)', () => {
    expect(Object.isFrozen(config)).toBe(true);

    // AUDIT 2026-08 : ce test attendait une exception. Object.freeze ne garantit
    // pas cela — une écriture sur un objet gelé ne lève QU'EN mode strict, et
    // échoue silencieusement sinon. Le transpileur Jest émet du CommonJS non
    // strict, donc l'assertion ne pouvait pas passer dans cet environnement.
    //
    // La garantie réelle du gel, c'est l'absence d'effet : on teste ça.
    const before = config.env;
    try {
      // @ts-expect-error — intentional mutation attempt
      config.env = 'production';
    } catch {
      // Mode strict : l'exception est acceptable, l'invariant reste le même.
    }
    expect(config.env).toBe(before);
  });
});
