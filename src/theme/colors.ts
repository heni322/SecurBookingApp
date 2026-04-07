/**
 * SecurBook Design System — Color Palette
 */

export const palette = {
  obsidian:    '#0A0C0F',
  obsidian90:  '#0F1215',
  obsidian80:  '#141820',
  obsidian70:  '#1C2330',
  obsidian60:  '#252E3D',
  obsidian50:  '#2E3A4E',
  slate10:     '#8892A4',
  slate20:     '#6B7689',
  slate30:     '#4A5568',
  amber:       '#F5A623',
  amberLight:  '#FFD080',
  amberDark:   '#C17B0A',
  emerald:     '#10B981',
  emeraldDim:  '#064E3B',
  crimson:     '#EF4444',
  crimsonDim:  '#7F1D1D',
  azure:       '#3B82F6',
  azureDim:    '#1E3A5F',
  violet:      '#8B5CF6',
  violetDim:   '#3B1F6E',
  gold:        '#EAB308',
  goldDim:     '#713F12',
  white:       '#FFFFFF',
  white90:     'rgba(255,255,255,0.9)',
  white60:     'rgba(255,255,255,0.6)',
  white30:     'rgba(255,255,255,0.3)',
  white10:     'rgba(255,255,255,0.1)',
  white05:     'rgba(255,255,255,0.05)',
  black:       '#000000',
} as const;

export const colors = {
  // Surfaces
  background:         palette.obsidian,
  backgroundElevated: palette.obsidian80,
  surface:            palette.obsidian70,
  surfaceHigh:        palette.obsidian60,
  surfaceBorder:      palette.obsidian50,

  // Text
  textPrimary:   palette.white,
  textSecondary: palette.white60,
  textMuted:     palette.white30,
  textInverse:   palette.obsidian,

  // ─── Shorthand aliases — fix TS2339 for colors.text ───────────────────
  text:          palette.white,       // alias → textPrimary

  // Primary (Amber)
  primary:        palette.amber,
  primaryLight:   palette.amberLight,
  primaryDark:    palette.amberDark,
  primarySurface: 'rgba(245,166,35,0.12)',

  // Status
  success:        palette.emerald,
  successSurface: palette.emeraldDim,
  danger:         palette.crimson,
  dangerSurface:  palette.crimsonDim,
  info:           palette.azure,
  infoSurface:    palette.azureDim,
  warning:        palette.gold,
  warningSurface: palette.goldDim,

  // Borders
  border:        palette.white10,
  borderStrong:  palette.white30,
  borderPrimary: 'rgba(245,166,35,0.4)',

  // Overlays
  overlay:       'rgba(10,12,15,0.85)',
  scrim:         'rgba(0,0,0,0.6)',

  // Utility
  transparent:   'transparent',
  white:         palette.white,
} as const;

export type ColorKey = keyof typeof colors;
