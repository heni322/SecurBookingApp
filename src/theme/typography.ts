/**
 * SecurBook Design System — Typography
 */

export const fontFamily = {
  // Display — used for headings, numbers, hero text
  display:       'SpaceGrotesk-Bold',
  displayMedium: 'SpaceGrotesk-Medium',
  // Body — readable at small sizes
  body:          'Inter-Regular',
  bodyMedium:    'Inter-Medium',
  bodySemiBold:  'Inter-SemiBold',
  // Mono — timestamps, codes, amounts
  mono:          'JetBrainsMono-Regular',
  monoMedium:    'JetBrainsMono-Medium',
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 42,
} as const;

export const lineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.7,
} as const;

export const letterSpacing = {
  tight:  -0.5,
  normal:  0,
  wide:    0.5,
  wider:   1.2,
  widest:  2.0,
} as const;

export const fontWeight = {
  regular:   '400',
  medium:    '500',
  semiBold:  '600',
  bold:      '700',
  extraBold: '800',
} as const;
