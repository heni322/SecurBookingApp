/**
 * SecurBook Design System — Spacing & Layout
 */

export const spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,

  // ─── Named aliases ────────────────────────────────────────────────────────
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 40,
} as const;

export const radius = {
  none:  0,
  sm:    6,
  md:    10,
  lg:    14,
  xl:    20,
  '2xl': 28,
  full:  9999,
} as const;

export const shadow = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius:  3,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius:  8,
    elevation:     5,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius:  16,
    elevation:     10,
  },
  // Gold glow — used for primary buttons, focused inputs, cards
  gold: {
    shadowColor:   '#bc933b',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius:  14,
    elevation:     6,
  },
  // Legacy alias — keeps backward-compat with old `shadow.amber` references
  amber: {
    shadowColor:   '#bc933b',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius:  14,
    elevation:     6,
  },
} as const;

export const layout = {
  screenPaddingH: 20,
  screenPaddingV: 16,
  cardPadding:    16,
  headerHeight:   56,
  tabBarHeight:   72,
  inputHeight:    52,
  buttonHeight:   52,
} as const;
