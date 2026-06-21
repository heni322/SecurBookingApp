/**
 * haptics.ts — crash-safe wrapper around `react-native-haptic-feedback`.
 *
 * Why the defensive loading?
 *  - The native TurboModule only exists after a native rebuild. In the window
 *    between adding the JS dependency and rebuilding (Metro fast-refresh,
 *    JS-only CI, Jest, or a non-RN runtime), the module may be absent — calls
 *    must degrade to a silent no-op rather than crash the user interaction.
 *  - Honours the user's OS-level haptic / system settings (handled natively by
 *    the library on both iOS and Android).
 *
 * Haptics are intentionally treated as *non-essential*: this module never
 * throws, so callers can fire feedback inline without guarding each call site.
 */

export type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

interface HapticModule {
  trigger: (type: HapticType, options?: object) => void;
}

/** Shape returned by `require()` — either the module itself or `{ default }`. */
type HapticImport = (Partial<HapticModule> & { default?: HapticModule }) | undefined;

const OPTIONS = {
  // Only fall back to a raw vibration when the device has no Taptic engine.
  enableVibrateFallback: false,
  // Respect the user's system haptic setting on Android (never force it).
  ignoreAndroidSystemSettings: false,
} as const;

let cached: HapticModule | null | undefined;
let enabled = true;

function resolve(): HapticModule | null {
  if (cached !== undefined) return cached;
  try {
    // Lazy require: not evaluated until first use, so an unlinked native
    // module or a non-RN runtime (Jest / node) cannot break module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-haptic-feedback') as HapticImport;
    cached = (mod?.default ?? mod ?? null) as HapticModule | null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Globally enable / disable haptics (e.g. wired to a user preference). */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Fire a haptic. Safe to call anywhere — never throws.
 * Defaults to the gentle `selection` tick (ideal for tab / segment changes).
 */
export function haptic(type: HapticType = 'selection'): void {
  if (!enabled) return;
  const mod = resolve();
  if (typeof mod?.trigger !== 'function') return;
  try {
    mod.trigger(type, OPTIONS);
  } catch {
    // Swallow: haptics are non-essential and must never disrupt the action.
  }
}
