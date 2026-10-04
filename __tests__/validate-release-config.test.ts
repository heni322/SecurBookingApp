/**
 * Release-config gate — behaviour tests.
 *
 * Context (audit 2026-08, P0-3): the production profile shipped with a
 * placeholder Stripe live key and crashReporting enabled against an empty
 * Sentry DSN. The runtime validator in src/config/env.ts detects the Stripe
 * placeholder but only console.errors in release builds, so the app boots and
 * payment fails at the last step of the funnel.
 *
 * scripts/validate-release-config.js moves that check to build time. These
 * tests pin its behaviour so it cannot quietly stop failing — a gate that
 * always passes is worse than no gate, because it is trusted.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'validate-release-config.js');

/** Run the gate and capture exit code + combined output. */
function run(args: string[] = []): { code: number; out: string } {
  try {
    const out = execFileSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e: any) {
    return {
      code: e.status ?? 1,
      out: `${e.stdout ?? ''}${e.stderr ?? ''}`,
    };
  }
}

describe('validate-release-config', () => {
  // These run a real child process against the real environments.ts, so they
  // are slower than a unit test. Worth it: the point of this gate is that it
  // reflects the file as actually committed, not a fixture.
  jest.setTimeout(30_000);

  it('fails on the production profile while placeholders remain', () => {
    const { code, out } = run();

    expect(code).toBe(1);
    expect(out).toMatch(/not shippable/i);
  });

  it('names the Stripe placeholder explicitly', () => {
    const { out } = run();

    // The message must identify the field, not just say "invalid config" —
    // this output is what a developer sees on a red build at release time.
    expect(out).toMatch(/stripe\.publishableKey/);
    expect(out).toMatch(/placeholder/i);
  });

  it('catches crashReporting enabled with an empty Sentry DSN', () => {
    const { out } = run();

    // Shipping "instrumented but reporting nowhere" is worse than shipping with
    // crash reporting off: nobody goes looking for the missing data.
    expect(out).toMatch(/crashReporting/);
    expect(out).toMatch(/sentryDsn/);
  });

  it('gates staging too, since staging is shipped to testers', () => {
    const { code, out } = run(['--env', 'staging']);

    expect(code).toBe(1);
    expect(out).toMatch(/staging/);
  });

  it('does not gate development builds', () => {
    // A developer without a Stripe test key must still be able to build and
    // run. Findings are reported, but this is a RELEASE gate.
    const { code, out } = run(['--env', 'development']);

    expect(code).toBe(0);
    expect(out).toMatch(/not gated/i);
  });

  it('rejects an unknown environment rather than silently passing', () => {
    const { code } = run(['--env', 'nope']);

    expect(code).toBe(1);
  });
});
