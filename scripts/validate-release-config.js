#!/usr/bin/env node
/**
 * validate-release-config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Build-time gate on the shipped environment profile.
 *
 * WHY THIS EXISTS (audit 2026-08, P0-3)
 * The production profile in src/config/environments.ts shipped with:
 *   • stripe.publishableKey = 'pk_live_REMPLACER_PAR_VOTRE_CLE_LIVE_STRIPE'
 *   • sentryDsn = ''  while features.crashReporting = true
 *
 * The runtime validator in src/config/env.ts already DETECTS the Stripe
 * placeholder — and then declines to act on it:
 *
 *     if (__DEV__) { throw new Error(msg); } else { console.error(msg); }
 *
 * That trade-off is defensible for soft config (never hard-crash a shipped app
 * over a lint), but it is wrong for a payment key: the app boots, the user
 * completes an entire booking, and payment dies at the last step. And nobody
 * reads a release build's console.
 *
 * Moving the check to BUILD time gets fail-fast safety with zero runtime crash
 * risk: a bad release never gets built. The runtime console.error stays as a
 * backstop for anything that slips past.
 *
 * USAGE
 *   node scripts/validate-release-config.js               # checks production
 *   node scripts/validate-release-config.js --env staging
 *
 * Run it in CI before any release build (see .github/workflows/ci.yml).
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'src', 'config', 'environments.ts');

const argIdx = process.argv.indexOf('--env');
const TARGET = argIdx !== -1 ? process.argv[argIdx + 1] : 'production';

/**
 * Load the real profile object rather than pattern-matching the source.
 * `import type { AppConfig }` is erased by the transpiler. The one runtime
 * import, package.json (the app version), is resolved relative to the source
 * file, as Metro would.
 */
function loadEnvironments() {
  const source = fs.readFileSync(ENV_FILE, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
    },
  });

  const module = { exports: {} };
  const requireFromSource = (id) =>
    require(id.startsWith('.') ? path.resolve(path.dirname(ENV_FILE), id) : id);
  new Function('exports', 'require', 'module', outputText)(
    module.exports,
    requireFromSource,
    module,
  );

  if (!module.exports.ENVIRONMENTS) {
    throw new Error(
      'ENVIRONMENTS export not found in src/config/environments.ts',
    );
  }
  return module.exports.ENVIRONMENTS;
}

const errors = [];
const warnings = [];

const err = m => errors.push(m);
const warn = m => warnings.push(m);

function check(cfg, envName) {
  // ── Placeholders ─────────────────────────────────────────────────────────
  // Catches the whole REMPLACER / REPLACE / TODO / CHANGE_ME family wherever
  // it appears, not just the two fields we happen to know about today.
  const placeholder = /REMPLACER|REPLACE_ME|CHANGE_ME|YOUR_|TODO|XXX/i;
  const walk = (obj, trail = []) => {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const at = [...trail, k].join('.');
      if (typeof v === 'string' && placeholder.test(v)) {
        err(`${at} is still a placeholder: "${v}"`);
      } else if (v && typeof v === 'object') {
        walk(v, [...trail, k]);
      }
    }
  };
  walk(cfg);

  // ── API endpoint ─────────────────────────────────────────────────────────
  const url = cfg.api?.baseUrl ?? '';
  if (!/^https?:\/\//.test(url)) {
    err(`api.baseUrl is not a valid URL: "${url}"`);
  }
  if (envName !== 'development') {
    if (!url.startsWith('https://')) {
      err(`${envName} api.baseUrl must use https:// (got "${url}")`);
    }
    if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|\.local\b/.test(url)) {
      err(`${envName} api.baseUrl points at a development host: "${url}"`);
    }
  }

  // ── Stripe ───────────────────────────────────────────────────────────────
  const key = cfg.stripe?.publishableKey ?? '';
  if (envName === 'production') {
    if (!key.startsWith('pk_live_')) {
      err(`production Stripe key must start with pk_live_ (got "${key}")`);
    }
  } else if (key.startsWith('pk_live_')) {
    // A LIVE key outside production means test runs charge real cards.
    err(`${envName} must not use a LIVE Stripe key`);
  }

  // ── Crash reporting ──────────────────────────────────────────────────────
  // crashReporting=true with an empty DSN is worse than having it off: the
  // build looks instrumented and reports nowhere, so nobody goes looking.
  if (cfg.features?.crashReporting && !cfg.sentryDsn) {
    err(
      `${envName} has features.crashReporting=true but sentryDsn is empty — ` +
        'the build would ship blind. Set the DSN, or turn crashReporting off.',
    );
  }

  // ── Release hygiene ──────────────────────────────────────────────────────
  if (envName === 'production') {
    if (cfg.features?.devMenu) err('production must not enable features.devMenu');
    if (cfg.features?.debugLogging) {
      err('production must not enable features.debugLogging');
    }
  }

  // Legal pages (audit 2026-09-30, P0-9): privacy policy, CGU, CGV and
  // mentions légales are a legal and app-store requirement. They must be real
  // HTTPS pages in anything shipped.
  if (envName !== 'development') {
    for (const k of ['privacyUrl', 'termsUrl', 'salesTermsUrl', 'legalNoticeUrl']) {
      const v = (cfg.legal && cfg.legal[k]) || '';
      if (!/^https:\/\/[^/]+\.[a-z]{2,}/i.test(v)) {
        err(`${envName} legal.${k} must be an https:// page (got "${v}")`);
      }
    }
    const support = (cfg.legal && cfg.legal.supportUrl) || '';
    if (!/^(https:\/\/|mailto:)/i.test(support)) {
      err(`${envName} legal.supportUrl must be https:// or mailto: (got "${support}")`);
    }
  }

  // ── Advisory ─────────────────────────────────────────────────────────────
  // Not gated: only the team knows which brand domain is correct. But a
  // production API host that shares no registrable domain with the app name is
  // worth a second look before shipping.
  if (envName === 'production' && cfg.appName) {
    const host = url.replace(/^https?:\/\//, '').split('/')[0];
    const brand = cfg.appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (brand && !host.toLowerCase().includes(brand)) {
      warn(
        `production api.baseUrl host "${host}" does not contain the app name ` +
          `"${cfg.appName}" — confirm this is the intended API domain.`,
      );
    }
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

let environments;
try {
  environments = loadEnvironments();
} catch (e) {
  console.error(`❌ could not load environment profiles: ${e.message}`);
  process.exit(1);
}

const cfg = environments[TARGET];
if (!cfg) {
  console.error(
    `❌ unknown env "${TARGET}". Known: ${Object.keys(environments).join(', ')}`,
  );
  process.exit(1);
}

check(cfg, TARGET);

for (const w of warnings) console.log(`⚠️  ${w}`);

// Development is never shipped, and its placeholders are expected — a developer
// without a Stripe test key should still be able to build and run. Report the
// findings so they are visible, but do not fail: this is a RELEASE gate.
if (TARGET === 'development') {
  for (const e of errors) console.log(`ℹ️  ${e}`);
  console.log(
    `✅ development profile checked (${errors.length} advisory finding(s); ` +
      'not gated — development builds are not released).',
  );
  process.exit(0);
}

if (errors.length === 0) {
  console.log(`✅ release config OK for env="${TARGET}".`);
  process.exit(0);
}

console.error('');
console.error(`❌ release config is not shippable for env="${TARGET}":`);
console.error('');
for (const e of errors) console.error(`   • ${e}`);
console.error('');
console.error('Fix src/config/environments.ts before building a release.');
console.error('');
process.exit(1);
