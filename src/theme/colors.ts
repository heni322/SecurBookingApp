/**
 * SecurBook Design System — Color Palette
 *
 * Token philosophy
 * ─────────────────
 * Each status (success / danger / info / warning) has THREE roles:
 *   X            : the vivid foreground tone — readable on dark bg
 *                   AND dark enough to read on the tinted X-Surface bg.
 *   X-Surface    : translucent tinted background for banners/cards.
 *   X-Dot        : the saturated solid fill for tiny indicators
 *                   (status dots, online badges, glow shadows).
 *
 * Rule: never put `colors.X` text on `colors.X-Dot` bg. Use X-Surface for bg.
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

  // -- Status accent dots (vivid solid fills) ----------------------------------
  uiGreen:  '#4ade80',
  uiPurple: '#c084fc',
  uiBlue:   '#60a5fa',
  uiRed:    '#e11d48',

  // -- Status text/icon tints (mid-saturation, readable on both dark + tinted) -
  txtGreen:  '#34d399',  // emerald-400 — readable on dark AND on green tinted bg
  txtPurple: '#a78bfa',  // violet-400
  txtBlue:   '#60a5fa',  // blue-400 — same as uiBlue, intentional
  txtRed:    '#f87171',  // red-400

  // -- Status background tints (translucent, for banners/cards) ----------------
  bgGreen:   'rgba(52, 211, 153, 0.13)',
  bgPurple:  'rgba(167, 139, 250, 0.13)',
  bgBlue:    'rgba(96, 165, 250, 0.13)',
  bgRed:     'rgba(248, 113, 113, 0.13)',
  bgGold:    'rgba(188, 147, 59, 0.13)',

  // -- Status borders for tinted bgs -------------------------------------------
  borderGreen:  'rgba(52, 211, 153, 0.45)',
  borderPurple: 'rgba(167, 139, 250, 0.45)',
  borderBlue:   'rgba(96, 165, 250, 0.45)',
  borderRed:    'rgba(248, 113, 113, 0.45)',
  borderGold:   'rgba(188, 147, 59, 0.45)',

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
  /** @deprecated palette.bg */            navy:        '#0c1220',
  /** @deprecated palette.panelSolid */    navy80:      '#0f172a',
  /** @deprecated border/surface */        navy50:      '#1e2d45',
  /** @deprecated palette.txtPurple */     violet:      '#a78bfa',
  /** @deprecated palette.uiGreen */       emeraldDim:  '#4ade80',
  /** @deprecated palette.txtGreen */      emerald:     '#34d399',
  /** @deprecated palette.uiRed */         crimsonDim:  '#e11d48',
  /** @deprecated palette.txtRed */        crimson:     '#f87171',
  /** @deprecated palette.panelSolid */    azureDim:    '#0f2b5c',
  /** @deprecated palette.uiBlue */        azure:       '#60a5fa',
  /** @deprecated palette.uiBlue */        lightBlue:   '#60a5fa',
  /** @deprecated darker blue */           lightBlueDim:'#1d4ed8',
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
  primarySurface: palette.bgGold,
  primaryGlow:    'rgba(188, 147, 59, 0.25)',

  // -- Status (success / danger / info / warning) -------------------------------
  // text/icon foreground — readable on dark AND on the tinted surface
  success:        palette.txtGreen,
  danger:         palette.txtRed,
  info:           palette.txtBlue,
  warning:        palette.goldTxt,

  // translucent bg for banners/badges — text uses success/danger/info/warning ON TOP
  successSurface: palette.bgGreen,
  dangerSurface:  palette.bgRed,
  infoSurface:    palette.bgBlue,
  warningSurface: palette.bgGold,

  // dedicated borders for tinted surfaces (1px, soft accent)
  successBorder:  palette.borderGreen,
  dangerBorder:   palette.borderRed,
  infoBorder:     palette.borderBlue,
  warningBorder:  palette.borderGold,

  // saturated solid fills — for tiny indicators (status dots, glow rings, online pulse)
  successDot:     palette.uiGreen,
  dangerDot:      palette.uiRed,
  infoDot:        palette.uiBlue,
  warningDot:     palette.gold,

  // -- Semantic shorthands -------------------------------------------------------
  lightBlue:  palette.uiBlue,
  violet:     palette.txtPurple,
  violetDim:  palette.uiPurple,

  // -- Borders -------------------------------------------------------------------
  border:        palette.panelBorder,
  borderStrong:  'rgba(255, 255, 255, 0.2)',
  borderPrimary: palette.borderGold,
  borderSubtle:  'rgba(255, 255, 255, 0.06)',

  // -- Overlays -----------------------------------------------------------------
  overlay: 'rgba(12, 18, 32, 0.88)',
  scrim:   'rgba(0, 0, 0, 0.65)',

  // -- Utility -------------------------------------------------------------------
  transparent: 'transparent',
  white:       palette.white,
  /** @deprecated colors.background */
  navy:        palette.bg,
} as const;

export type ColorKey = keyof typeof colors;
