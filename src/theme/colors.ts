/**
 * SecurBook Design System — Color Palette
 *
 * Brand identity:
 *   Primary (Gold)  #bc933b — warmth, prestige, security
 *   Base    (Navy)  #05172b — depth, trust, professionalism
 *
 * All surface steps are derived by progressively lightening the navy base.
 * All gold steps are derived from the brand gold.
 */

export const palette = {
  // ── Navy family (background hierarchy) ──────────────────────────────────────
  navy:     '#05172b',   // deepest background
  navy90:   '#061a30',   // slightly lighter
  navy80:   '#071e38',   // backgroundElevated
  navy70:   '#09253f',   // surface
  navy60:   '#0d2c49',   // surfaceHigh
  navy50:   '#123352',   // surfaceBorder / dividers
  navy40:   '#1a3d5e',   // subtle borders
  navy30:   '#234a6e',   // active states

  // ── Gold family (primary accent) ────────────────────────────────────────────
  gold:         '#bc933b',   // brand gold — primary
  goldLight:    '#d4aa5c',   // hover, lighter accents
  goldLighter:  '#e8c87a',   // very light, disabled states
  goldDark:     '#8f6e27',   // pressed, dark accents
  goldDeeper:   '#6a5019',   // very deep gold

  // ── Semantic ─────────────────────────────────────────────────────────────────
  emerald:     '#10B981',
  emeraldDim:  '#043D2E',
  crimson:     '#EF4444',
  crimsonDim:  '#4D1414',
  azure:       '#3B82F6',
  azureDim:    '#0F2B5C',
  violet:      '#8B5CF6',
  violetDim:   '#2D1660',
  amber:       '#F5A623',   // kept for warnings (distinct from gold)
  amberDim:    '#4D3208',

  // ── Neutrals ─────────────────────────────────────────────────────────────────
  white:     '#FFFFFF',
  white90:   'rgba(255,255,255,0.9)',
  white70:   'rgba(255,255,255,0.7)',
  white60:   'rgba(255,255,255,0.6)',
  white40:   'rgba(255,255,255,0.4)',
  white30:   'rgba(255,255,255,0.3)',
  white15:   'rgba(255,255,255,0.15)',
  white10:   'rgba(255,255,255,0.10)',
  white06:   'rgba(255,255,255,0.06)',
  white05:   'rgba(255,255,255,0.05)',
  white04:   'rgba(255,255,255,0.04)',
  black:     '#000000',
} as const;

export const colors = {
  // ── Surfaces ──────────────────────────────────────────────────────────────────
  background:         palette.navy,        // #05172b — deepest
  backgroundElevated: palette.navy80,      // #071e38 — cards, modals
  surface:            palette.navy70,      // #09253f — inputs, chips
  surfaceHigh:        palette.navy60,      // #0d2c49 — active row bg
  surfaceBorder:      palette.navy50,      // #123352 — dividers

  // ── Text ──────────────────────────────────────────────────────────────────────
  textPrimary:   palette.white,         // pure white for headings
  textSecondary: palette.white70,       // secondary labels
  textMuted:     palette.white40,       // placeholders, captions
  textInverse:   palette.navy,          // dark text on gold buttons
  text:          palette.white,         // shorthand alias → textPrimary

  // ── Primary — Gold ────────────────────────────────────────────────────────────
  primary:        palette.gold,                     // #bc933b
  primaryLight:   palette.goldLight,                // #d4aa5c
  primaryDark:    palette.goldDark,                 // #8f6e27
  primarySurface: 'rgba(188,147,59,0.13)',           // subtle gold tint
  primaryGlow:    'rgba(188,147,59,0.25)',           // glow / focus ring

  // ── Status ────────────────────────────────────────────────────────────────────
  success:        palette.emerald,
  successSurface: palette.emeraldDim,
  danger:         palette.crimson,
  dangerSurface:  palette.crimsonDim,
  info:           palette.azure,
  infoSurface:    palette.azureDim,
  warning:        palette.amber,
  warningSurface: palette.amberDim,

  // ── Borders ───────────────────────────────────────────────────────────────────
  border:        palette.white10,
  borderStrong:  palette.white30,
  borderPrimary: 'rgba(188,147,59,0.45)',   // gold border
  borderSubtle:  palette.white06,

  // ── Overlays ─────────────────────────────────────────────────────────────────
  overlay: 'rgba(5,23,43,0.88)',    // navy-tinted overlay
  scrim:   'rgba(0,0,0,0.65)',

  // ── Utility ───────────────────────────────────────────────────────────────────
  transparent: 'transparent',
  white:       palette.white,
  navy:        palette.navy,
} as const;

export type ColorKey = keyof typeof colors;
