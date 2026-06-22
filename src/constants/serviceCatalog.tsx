/**
 * serviceCatalog — Shared security-service & uniform metadata.
 *
 * Single source of truth for:
 *   • UNIFORM_OPTIONS / UniformValue / DEFAULT_UNIFORM / UNIFORM_EMOJI
 *   • getServiceMeta() — maps a service-type name to its icon + accent colour
 *
 * Lives under @constants so any screen (mission creation, summaries, pickers)
 * can import it without depending on a specific screen module. Previously this
 * lived inside ServicePickerScreen; it was extracted when the service/agent
 * selection was merged into the mission-creation "Quand & agents" step.
 */
import React from 'react';
import {
  Shield, Building2, Flame, Dog, Car, Star, UserCheck,
} from 'lucide-react-native';
import { palette } from '@theme/colors';

// -- Uniform config ------------------------------------------------------------
export const UNIFORM_OPTIONS = [
  { value: 'STANDARD', emoji: '🦺' },
  { value: 'CIVIL', emoji: '👔' },
  { value: 'EVENEMENTIEL', emoji: '🤵' },
  { value: 'SSIAP', emoji: '🔥' },
  { value: 'CYNOPHILE', emoji: '🐕' },
] as const;

export type UniformValue = (typeof UNIFORM_OPTIONS)[number]['value'];
export const DEFAULT_UNIFORM: UniformValue = 'STANDARD';

/** Emoji lookup derived from UNIFORM_OPTIONS so the two never drift apart. */
export const UNIFORM_EMOJI: Record<UniformValue, string> = UNIFORM_OPTIONS.reduce(
  (acc, o) => { acc[o.value] = o.emoji; return acc; },
  {} as Record<UniformValue, string>,
);

// -- Service icon / accent map -------------------------------------------------
export type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

const SERVICE_ICON_MAP: Array<{ keywords: string[]; Icon: LucideIconComp; accent: string }> = [
  { keywords: ['luxe', 'hotel', 'vip'],                Icon: Star,      accent: palette.goldTxt },
  { keywords: ['cynophile', 'chien', 'dog'],           Icon: Dog,       accent: palette.txtGreen },
  { keywords: ['incendie', 'ssiap', 'feu'],            Icon: Flame,     accent: palette.txtRed },
  { keywords: ['rondier', 'mobile', 'voiture'],        Icon: Car,       accent: palette.txtBlue },
  { keywords: ['corps', 'apr', 'garde'],               Icon: UserCheck, accent: palette.txtPurple },
  { keywords: ['equipe', 'chef', 'coord'],             Icon: Building2, accent: palette.txtBlue },
];

/** Resolve a display icon + accent colour for a service-type name. */
export function getServiceMeta(name: string): { Icon: LucideIconComp; accent: string } {
  const n = (name ?? '').toLowerCase();
  return SERVICE_ICON_MAP.find(({ keywords }) => keywords.some(k => n.includes(k)))
    ?? { Icon: Shield, accent: palette.txtBlue };
}

// -- Tenue matching (mirror of backend uniform-matching.ts) --------------------
// The API now returns `matchingUniforms` + `defaultUniform` per service type.
// This local map is the fallback used when those fields are absent (older API
// build, cached payload, or an offline draft). Keep it in sync with the
// backend's src/common/constants/uniform-matching.ts — first entry = default.
const CATEGORY_UNIFORMS: Record<string, UniformValue[]> = {
  GARDIENNAGE:  ['STANDARD', 'CIVIL'],
  LUXE:         ['CIVIL', 'EVENEMENTIEL', 'STANDARD'],
  CYNOPHILE:    ['CYNOPHILE'],
  SSIAP:        ['SSIAP'],
  PROTECTION:   ['CIVIL', 'STANDARD'],
  EVENEMENTIEL: ['EVENEMENTIEL', 'STANDARD', 'CIVIL'],
  MOBILE:       ['STANDARD'],
};
const FALLBACK_UNIFORMS: UniformValue[] = ['STANDARD', 'CIVIL'];

const VALID_UNIFORMS = new Set<string>(UNIFORM_OPTIONS.map(o => o.value));

interface ServiceLike {
  category?: string;
  matchingUniforms?: { value: string; isDefault: boolean }[];
  defaultUniform?: string;
}

/**
 * Allowed tenues for a service (default first). Prefers the API-provided
 * `matchingUniforms`; falls back to the local category map. Always returns a
 * non-empty, de-duplicated list of values known to UNIFORM_OPTIONS.
 */
export function allowedUniformsForService(svc: ServiceLike): UniformValue[] {
  const fromApi = svc.matchingUniforms
    ?.map(m => m.value)
    .filter((v): v is UniformValue => VALID_UNIFORMS.has(v));
  if (fromApi && fromApi.length > 0) {
    // Honour isDefault by moving the flagged value to the front.
    const def = svc.matchingUniforms!.find(m => m.isDefault && VALID_UNIFORMS.has(m.value))?.value as UniformValue | undefined;
    const ordered = def ? [def, ...fromApi.filter(v => v !== def)] : fromApi;
    return Array.from(new Set(ordered));
  }
  const byCat = (svc.category && CATEGORY_UNIFORMS[svc.category]) || FALLBACK_UNIFORMS;
  return [...byCat];
}

/** The default (most appropriate) tenue for a service. */
export function defaultUniformForService(svc: ServiceLike): UniformValue {
  if (svc.defaultUniform && VALID_UNIFORMS.has(svc.defaultUniform)) {
    return svc.defaultUniform as UniformValue;
  }
  return allowedUniformsForService(svc)[0] ?? DEFAULT_UNIFORM;
}
