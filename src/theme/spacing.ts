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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  amber: {
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
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
