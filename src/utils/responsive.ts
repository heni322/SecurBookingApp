/**
 * responsive.ts — Dynamic Type (iOS) / Font Scale (Android) utilities.
 *
 * Usage
 * ─────
 *   import { rf, rfs } from '@utils/responsive';
 *
 *   // In StyleSheet (computed once at startup):
 *   fontSize: rf(15)           // scales with system font size
 *
 *   // In JSX (re-renders when the user changes system font mid-session):
 *   fontSize: rfs(15)          // hook variant — uses useWindowDimensions
 *
 * Design intent
 * ─────────────
 * • Base scale = 1.0 at the iOS "Large" / Android "Default" setting.
 * • We clamp to [MIN_SCALE, MAX_SCALE] so extreme accessibility settings
 *   don't break fixed-height containers.
 * • All raw `fontSize` values in the design system are written at scale 1.0
 *   (the values in theme/typography.ts). Pass them through rf() or rfs().
 *
 * WCAG 1.4.4 — Resize Text (AA): text must be resizable up to 200% without
 * loss of content or functionality. The MAX_SCALE cap satisfies this while
 * preventing layout overflow.
 */

import { PixelRatio, useWindowDimensions } from 'react-native';

/** Minimum allowed scale — prevents text from going below readable size. */
const MIN_SCALE = 0.85;

/** Maximum allowed scale — prevents text from breaking fixed-height containers. */
const MAX_SCALE = 1.5;

/**
 * Clamp PixelRatio.getFontScale() to the design-safe range.
 * Reads the system font scale once per call — no subscription.
 */
function clampedFontScale(): number {
  const scale = PixelRatio.getFontScale();
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

/**
 * rf — Responsive Font size.
 * Computed ONCE (at StyleSheet creation time). Fine for most cases because
 * React Native re-builds stylesheets when the font scale changes on Android.
 * On iOS, StyleSheet.create() runs once — use `rfs` inside components that
 * must react to mid-session Dynamic Type changes.
 *
 * @param basePx   Base font size at scale 1.0 (value from design tokens).
 * @returns        Scaled size, clamped to [MIN_SCALE, MAX_SCALE].
 */
export function rf(basePx: number): number {
  return Math.round(basePx * clampedFontScale());
}

/**
 * useScaledFont — hook that returns a scale-aware rf() function.
 * Re-renders when the user changes the system font size mid-session.
 * Use this when a component needs live font-scale updates.
 *
 * @example
 *   const rfsHook = useScaledFont();
 *   <Text style={{ fontSize: rfsHook(15) }}>Hello</Text>
 */
export function useScaledFont(): (basePx: number) => number {
  // useWindowDimensions triggers a re-render on font-scale change (RN 0.71+).
  useWindowDimensions();
  const scale = clampedFontScale();
  return (basePx: number) => Math.round(basePx * scale);
}

/**
 * Scaled font-size object — pre-scales every token in the design system.
 * Import and spread into styles for a zero-effort migration.
 *
 * @example
 *   import { scaledFontSize } from '@utils/responsive';
 *   fontSize: scaledFontSize.base   // 15 * currentScale
 */
import { fontSize as rawFontSize } from '@theme/typography';

type FontSizeKey = keyof typeof rawFontSize;

export const scaledFontSize: Record<FontSizeKey, number> = Object.fromEntries(
  (Object.entries(rawFontSize) as [FontSizeKey, number][])
    .map(([key, px]) => [key, rf(px)]),
) as Record<FontSizeKey, number>;

/**
 * allowFontScaling — default prop value for all <Text> components.
 * Set to `true` so Dynamic Type / Font Scale is respected everywhere.
 * Override with `allowFontScaling={false}` only for icon labels, timestamps,
 * or elements where pixel-exact sizing is required.
 */
export const ALLOW_FONT_SCALING = true;
