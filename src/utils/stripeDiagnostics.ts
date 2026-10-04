/**
 * stripeDiagnostics — turns silent Stripe misconfiguration into a loud, specific
 * message.
 *
 * WHY THIS EXISTS
 * ───────────────
 * On 2026-09-12 the "Payer" CTA on PaymentScreen was permanently disabled. Two
 * unrelated faults produced one identical, silent symptom:
 *
 *   1. `config.stripe.publishableKey` was still the literal placeholder
 *      'pk_test_REMPLACER_...'. The key validator in config/env.ts DOES check
 *      for this — but only inside an `if (cfg.env === 'production')` branch, so
 *      in development the single most useful check never ran.
 *
 *   2. @stripe/stripe-react-native@0.40.0 ships NO New Architecture support for
 *      its view components (no `codegenConfig`, no `codegenNativeComponent`,
 *      CardFieldViewManager is a legacy Paper SimpleViewManager). The app runs
 *      React Native 0.84 with newArchEnabled=true, so CardField renders through
 *      the legacy interop layer and you can type into it, but its event binding
 *      never reaches JS. `onCardChange` never fires, so `cardComplete` stays
 *      false forever. Android logcat says this out loud at every launch:
 *
 *        W ViewManagerPropertyUpdater: Could not find generated setter for
 *          class com.reactnativestripesdk.CardFieldViewManager
 *
 * In both cases the UI showed a greyed-out button and nothing else. Nothing was
 * wrong with what the user typed, and no amount of retyping could help. That is
 * the worst possible failure mode: the app knows it cannot work and says
 * nothing.
 *
 * DESIGN
 * ──────
 * These checks are DETERMINISTIC, not heuristic — each one reads a fact
 * (the key string, the SDK's own package manifest, the renderer in use) rather
 * than inferring from behaviour. A check that cannot establish its fact returns
 * nothing instead of guessing, so this never invents a problem.
 */
import { config } from '@config';

export type StripeIssueCode =
  | 'KEY_MISSING'
  | 'KEY_PLACEHOLDER'
  | 'KEY_MALFORMED'
  | 'KEY_LIVE_IN_DEV'
  | 'CARDFIELD_NEW_ARCH_UNSUPPORTED';

export interface StripeIssue {
  code: StripeIssueCode;
  /** One line, shown as the banner headline. */
  title: string;
  /** What is actually wrong, in terms of an observable fact. */
  detail: string;
  /** The concrete next action. */
  fix: string;
  /** true when the card CTA can never enable until this is resolved. */
  blocksCardEntry: boolean;
}

/** Fabric / Bridgeless detection. Both globals are set by modern RN runtimes. */
function isNewArchitecture(): boolean {
  const g = globalThis as any;
  return g?.nativeFabricUIManager != null || g?.RN$Bridgeless === true;
}

/**
 * Reads the Stripe SDK's own manifest. `codegenConfig` is exactly what tells
 * React Native's codegen to generate Fabric components for CardField et al.
 * Its absence is ground truth that the view components are legacy-only.
 *
 * Returns null when the manifest cannot be read (bundler `exports` restrictions
 * etc.) — in that case we stay quiet rather than report a problem we have not
 * actually established.
 */
function readStripeManifest(): { version: string; hasCodegen: boolean } | null {
  try {
    const pkg = require('@stripe/stripe-react-native/package.json');
    if (!pkg) return null;
    return {
      version: String(pkg.version ?? 'unknown'),
      hasCodegen: Boolean(pkg.codegenConfig),
    };
  } catch {
    return null;
  }
}

/** Every problem currently preventing Stripe from working. Empty = healthy. */
export function inspectStripeSetup(): StripeIssue[] {
  const issues: StripeIssue[] = [];
  const key = config.stripe.publishableKey ?? '';

  // ── 1. Publishable key ────────────────────────────────────────────────────
  if (!key.trim()) {
    issues.push({
      code: 'KEY_MISSING',
      title: 'Stripe publishable key is empty',
      detail: 'config.stripe.publishableKey is an empty string.',
      fix: `Set the key for the "${config.env}" profile in src/config/environments.ts.`,
      blocksCardEntry: true,
    });
  } else if (key.includes('REMPLACER')) {
    issues.push({
      code: 'KEY_PLACEHOLDER',
      title: 'Stripe publishable key is still the placeholder',
      detail: `The key is "${key}", the untouched template value.`,
      fix:
        `Paste your real key into the "${config.env}" profile in ` +
        'src/config/environments.ts (Stripe Dashboard → Developers → API keys), ' +
        'then restart Metro with --reset-cache.',
      blocksCardEntry: true,
    });
  } else if (!/^pk_(test|live)_/.test(key)) {
    issues.push({
      code: 'KEY_MALFORMED',
      title: 'Stripe publishable key has the wrong shape',
      detail: `Keys must start with pk_test_ or pk_live_; this one starts "${key.slice(0, 8)}…".`,
      fix: 'Check you copied the PUBLISHABLE key, not the secret (sk_) key.',
      blocksCardEntry: true,
    });
  } else if (config.env !== 'production' && key.startsWith('pk_live_')) {
    issues.push({
      code: 'KEY_LIVE_IN_DEV',
      title: `LIVE Stripe key in "${config.env}"`,
      detail: 'A pk_live_ key charges real cards.',
      fix: 'Swap it for your pk_test_ key before testing.',
      blocksCardEntry: false,
    });
  }

  // ── 2. CardField vs the active renderer ───────────────────────────────────
  const manifest = readStripeManifest();
  if (manifest && isNewArchitecture() && !manifest.hasCodegen) {
    issues.push({
      code: 'CARDFIELD_NEW_ARCH_UNSUPPORTED',
      title: 'CardField cannot work on the New Architecture',
      detail:
        `@stripe/stripe-react-native@${manifest.version} declares no codegenConfig, ` +
        'so its view components are legacy-only — but this app runs Fabric ' +
        '(newArchEnabled=true). CardField renders and accepts typing, yet its ' +
        'onCardChange event never reaches JS, so the form can never report itself ' +
        'as complete. Android logcat confirms it: "Could not find generated setter ' +
        'for class com.reactnativestripesdk.CardFieldViewManager".',
      fix:
        'Upgrade @stripe/stripe-react-native to a release that ships codegenConfig ' +
        '(0.76.0 is current) and rebuild the native app — a Metro reload is not ' +
        'enough. Alternatively use the PaymentSheet API, which is a native module ' +
        'rather than a Fabric view and is unaffected.',
      blocksCardEntry: true,
    });
  }

  return issues;
}

/** True when no issue blocks entering card details. */
export function canCollectCardDetails(issues: StripeIssue[]): boolean {
  return !issues.some(i => i.blocksCardEntry);
}

/**
 * Logs issues once per app session. Called from App.tsx so the problem appears
 * at boot rather than only when someone reaches checkout.
 */
let alreadyLogged = false;
export function logStripeSetupOnce(): StripeIssue[] {
  const issues = inspectStripeSetup();
  if (alreadyLogged || issues.length === 0) return issues;
  alreadyLogged = true;
  console.error(
    '[stripe] Configuration problems detected:\n' +
      issues
        .map(i => `  • ${i.title}\n      ${i.detail}\n      FIX: ${i.fix}`)
        .join('\n'),
  );
  return issues;
}
