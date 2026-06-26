/**
 * formatters.ts — utilitaires de formatage SecurBook (client app)
 *
 * [FIX H5] Locale awareness. Every Intl formatter previously hardcoded 'fr-FR',
 * so an English-language user still saw French-formatted dates, times and
 * distances (including the LiveTracking "last seen" label and distance badges).
 * We now resolve the active locale from i18n at call time via activeLocale(),
 * falling back to 'fr-FR' when i18n is unavailable (e.g. unit tests). Currency
 * stays EUR regardless of language because the business operates in euros.
 */
import i18n from '@i18n';

/** Map the active i18n language ('fr' | 'en' | …) to a BCP-47 locale tag. */
const LOCALE_BY_LANG: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

/**
 * Resolve the BCP-47 locale for Intl from the active i18n language.
 * Defensive: i18n may not be initialised in some test contexts.
 */
const activeLocale = (): string => {
  try {
    const lang = (i18n?.language ?? 'fr').split('-')[0];
    return LOCALE_BY_LANG[lang] ?? 'fr-FR';
  } catch {
    return 'fr-FR';
  }
};

/**
 * Coerce a value to a finite number, or `null` if not coercible.
 * Tolerates: number, numeric string, Decimal-like string. Rejects: NaN, ±Infinity, null, undefined.
 *
 * Why this exists: Prisma `Decimal` columns can serialize as strings over JSON,
 * and missing fields land as `undefined`. Rendering `undefined * 100` gives "NaN €"
 * to the user — never acceptable. This helper is the universal numeric guard.
 */
const toFinite = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Formate un montant en centimes → "1 250,00 €". Returns "—" for non-finite input. */
export const formatCurrency = (cents: number, currency = 'EUR', locale = activeLocale()): string => {
  const n = toFinite(cents);
  if (n === null) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(n / 100);
};

/** Formate directement des euros → "125,50 €" (pour les montants déjà en €, ex: quotes, payouts). Returns "—" for non-finite input. */
export const formatEuros = (euros: number, locale = activeLocale()): string => {
  const n = toFinite(euros);
  if (n === null) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
};

/** Formate un taux horaire brut → "18,50 €/h". Returns "—" for non-finite input. */
export const formatRate = (euroPerHour: number): string => {
  const n = toFinite(euroPerHour);
  if (n === null) return '—';
  return `${new Intl.NumberFormat(activeLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €/h`;
};

const safeDate = (v: string | Date | number | null | undefined): Date | null => {
  if (v == null) return null;
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
};

/** Date ISO → "lun. 26 mars 2026" */
export const formatDate = (v: string | Date | null | undefined): string => {
  const d = safeDate(v);
  return d
    ? new Intl.DateTimeFormat(activeLocale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
    : '—';
};

/** Date ISO → "26/03/2026" */
export const formatDateShort = (v: string | Date | null | undefined): string => {
  const d = safeDate(v);
  return d ? new Intl.DateTimeFormat(activeLocale()).format(d) : '—';
};

/** Heure ISO, Date ou timestamp → "14:30" */
export const formatTime = (v: string | Date | number | null | undefined): string => {
  const d = safeDate(v);
  return d ? new Intl.DateTimeFormat(activeLocale(), { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
};

/** "26/03 · 08:00 → 16:00" */
export const formatMissionRange = (startAt: string, endAt: string): string => {
  const s = new Date(startAt), e = new Date(endAt);
  const loc = activeLocale();
  const date = new Intl.DateTimeFormat(loc, { day: '2-digit', month: '2-digit' }).format(s);
  const st   = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(s);
  const en   = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(e);
  return `${date} · ${st} → ${en}`;
};

/** Durée en minutes → "2h 30min" */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

/** Initiales depuis un nom complet → "JD" */
export const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName?.trim()) return '?';
  return fullName.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
};

/** Distance en km → "4,2 km" */
export const formatDistance = (km: number): string =>
  `${new Intl.NumberFormat(activeLocale(), { maximumFractionDigits: 1 }).format(km)} km`;
