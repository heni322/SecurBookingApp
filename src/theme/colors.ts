/**
 * SecurBook Design System — Color Palette
 *
 * Minimized token set aligned to the CSS variable system:
 *   --background   --foreground   --panel   --panel-border
 *   --muted        --muted-strong
 *   --ui-gold-grad --ui-green  --ui-purple  --ui-blue  --ui-red
 *   --txt-gold     --txt-green --txt-purple --txt-blue --txt-red
 *
 * Rule: ui-* = vivid accent (icons, pills, borders)
 *        txt-* = soft tint  (readable text on dark panels)
 */

export const palette = {
  // -- Base surfaces -------------------------------------------------------------
  bg:          '#0c1220',               // --background
  panelSolid:  '#0f172a',              // solid panel (Stripe, WebViews, skeleton)
  panel:       'rgba(15, 23, 42, 0.8)', // --panel (cards, modals)
  panelBorder: 'rgba(255, 255, 255, 0.1)', // --panel-border

  // -- Typography ---------------------------------------------------------------
  fg:          '#f1f5f9',  // --foreground
  muted:       '#94a3b8',  // --muted  (placeholders, captions)
  mutedStrong: '#cbd5e1',  // --muted-strong (secondary labels)

  // -- Brand gold ---------------------------------------------------------------
  gold:     '#bc933b',   // --ui-gold (buttons, icons, accents)
  goldEnd:  '#f1d592',   // --ui-gold-grad end stop
  goldTxt:  '#f1c47d',   // --txt-gold (readable text on dark)
  goldDark: '#8f6e27',   // pressed / shadow tint

  // -- UI accent colors (icons, rings, vivid pill bgs) -------------------------
  uiGreen:  '#4ade80',   // --ui-green
  uiPurple: '#c084fc',   // --ui-purple
  uiBlue:   '#60a5fa',   // --ui-blue
  uiRed:    '#e11d48',   // --ui-red

  // -- Text tints (soft, readable on --panel) ----------------------------------
  txtGreen:  '#86efac',  // --txt-green
  txtPurple: '#d8b4fe',  // --txt-purple
  txtBlue:   '#93c5fd',  // --txt-blue
  txtRed:    '#fb7185',  // --txt-red

  // -- Neutrals -----------------------------------------------------------------
  white:   '#ffffff',
  white90: 'rgba(255,255,255,0.9)',
  white70: 'rgba(255,255,255,0.7)',
  white60: 'rgba(255,255,255,0.6)',
  white40: 'rgba(255,255,255,0.4)',
  white30: 'rgba(255,255,255,0.3)',
  white15: 'rgba(255,255,255,0.15)',
  white10: 'rgba(255,255,255,0.10)',
  white06: 'rgba(255,255,255,0.06)',
  white05: 'rgba(255,255,255,0.05)',
  white04: 'rgba(255,255,255,0.04)',
  black:   '#000000',

  // -- Back-compat aliases -------------------------------------------------------
  // Referenced by files that import `palette` directly. Do not remove.
  /** @deprecated ? palette.bg */           navy:        '#0c1220',
  /** @deprecated ? palette.panelSolid */   navy80:      '#0f172a',
  /** @deprecated ? border/surface */       navy50:      '#1e2d45',
  /** @deprecated ? palette.txtPurple */    violet:      '#d8b4fe',
  /** @deprecated ? palette.uiGreen */      emeraldDim:  '#4ade80',
  /** @deprecated ? palette.txtGreen */     emerald:     '#86efac',
  /** @deprecated ? palette.uiRed */        crimsonDim:  '#e11d48',
  /** @deprecated ? palette.txtRed */       crimson:     '#fb7185',
  /** @deprecated ? palette.panelSolid */   azureDim:    '#0f2b5c',
  /** @deprecated ? palette.uiBlue */       azure:       '#60a5fa',
  /** @deprecated ? palette.uiBlue */       lightBlue:   '#60a5fa',
  /** @deprecated ? darker blue */          lightBlueDim:'#1d4ed8',
} as const;

export const colors = {
  // -- Surfaces ------------------------------------------------------------------
  background:         palette.bg,
  backgroundElevated: palette.panel,
  surface:            'rgba(15, 23, 42, 0.5)',
  surfaceHigh:        'rgba(15, 23, 42, 0.65)',
  surfaceBorder:      palette.panelBorder,

  // -- Text ----------------------------------------------------------------------
  textPrimary:   palette.fg,
  textSecondary: palette.mutedStrong,
  textMuted:     palette.muted,
  textInverse:   palette.bg,
  text:          palette.fg,

  // -- Primary — Gold ------------------------------------------------------------
  primary:        palette.gold,
  primaryLight:   palette.goldTxt,
  primaryDark:    palette.goldDark,
  primarySurface: 'rgba(188, 147, 59, 0.13)',
  primaryGlow:    'rgba(188, 147, 59, 0.25)',

  // -- Status --------------------------------------------------------------------
  /** soft text green — badge labels, validated text */
  success:        palette.txtGreen,
  /** vivid ui green — icon fills, ring borders, dot indicators */
  successSurface: palette.uiGreen,
  /** soft text red */
  danger:         palette.txtRed,
  /** vivid ui red — danger buttons, icon fills */
  dangerSurface:  palette.uiRed,
  /** soft text blue */
  info:           palette.txtBlue,
  /** vivid ui blue — info icons, tracking button */
  infoSurface:    palette.uiBlue,
  /** gold text — star ratings, warnings */
  warning:        palette.goldTxt,
  warningSurface: 'rgba(188, 147, 59, 0.15)',

  // -- Semantic shorthands -------------------------------------------------------
  lightBlue:  palette.uiBlue,
  violet:     palette.txtPurple,
  violetDim:  palette.uiPurple,

  // -- Borders -------------------------------------------------------------------
  border:        palette.panelBorder,
  borderStrong:  'rgba(255, 255, 255, 0.2)',
  borderPrimary: 'rgba(188, 147, 59, 0.45)',
  borderSubtle:  'rgba(255, 255, 255, 0.06)',

  // -- Overlays -----------------------------------------------------------------
  overlay: 'rgba(12, 18, 32, 0.88)',
  scrim:   'rgba(0, 0, 0, 0.65)',

  // -- Utility -------------------------------------------------------------------
  transparent: 'transparent',
  white:       palette.white,
  /** @deprecated ? colors.background */
  navy:        palette.bg,
} as const;

export type ColorKey = keyof typeof colors;


