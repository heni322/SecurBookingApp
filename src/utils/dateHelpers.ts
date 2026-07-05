/**
 * Shared date helpers specific to in-form date pickers (FR locale).
 *
 * Why a separate file from formatters.ts:
 *  - formatters.ts already exports `formatDateShort` and `formatDate` for
 *    *ISO string → label* conversion in lists, cards, etc.
 *  - The date-picker UI in AddDocumentScreen / PartnerAddDocumentScreen needs
 *    *Date object → label* helpers, FR_MONTHS array constants for spinners,
 *    and clamp-to-future predicates. Different concerns, different file.
 */

export const FR_MONTHS_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
] as const;

export const FR_MONTHS_FULL = [
  'Janvier', 'Février', 'Mars',      'Avril',   'Mai',      'Juin',
  'Juillet', 'Août',    'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "21 Sep 2026" from a Date object. */
export const labelDateShort = (d: Date) =>
  `${pad2(d.getDate())} ${FR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

/** "21 Septembre 2026" from a Date object. */
export const labelDateFull = (d: Date) =>
  `${pad2(d.getDate())} ${FR_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;

/** True iff `d` falls strictly after the start of today (local time). */
export const isFutureDate = (d: Date): boolean => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() > startOfToday.getTime();
};

/** Clamp a candidate date to `[min, max]`. Returns a fresh Date instance. */
export const clampDate = (candidate: Date, min: Date, max: Date): Date => {
  if (candidate.getTime() < min.getTime()) return new Date(min);
  if (candidate.getTime() > max.getTime()) return new Date(max);
  return new Date(candidate);
};
