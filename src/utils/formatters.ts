/**
 * formatters.ts — utilitaires de formatage pour SecurBook
 */

/** Formate un montant en centimes → "1 250,00 €" */
export const formatCurrency = (
  cents: number,
  currency = 'EUR',
  locale  = 'fr-FR',
): string =>
  new Intl.NumberFormat(locale, {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);

/** Formate un taux horaire brut → "18,50 €/h" */
export const formatRate = (euroPerHour: number): string =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(euroPerHour)} €/h`;

/** Garde-fou interne : retourne un Date valide ou null */
const safeDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

/** Formate une date ISO → "lun. 26 mars 2026" */
export const formatDate = (iso: string | null | undefined): string => {
  const d = safeDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  }).format(d);
};

/** Formate une date ISO → "26/03/2026" */
export const formatDateShort = (iso: string | null | undefined): string => {
  const d = safeDate(iso);
  return d ? new Intl.DateTimeFormat('fr-FR').format(d) : '—';
};

/** Formate une heure ISO → "14:30" */
export const formatTime = (iso: string | null | undefined): string => {
  const d = safeDate(iso);
  return d
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d)
    : '—';
};

/** Formate "26/03 · 08:00 → 16:00" */
export const formatMissionRange = (startAt: string, endAt: string): string => {
  const start = new Date(startAt);
  const end   = new Date(endAt);
  const date  = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(start);
  const s     = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(start);
  const e     = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(end);
  return `${date} · ${s} → ${e}`;
};

/** Durée en minutes → "2h 30min" */
export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

/** Initiales depuis un nom complet → "JD" */
export const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName?.trim()) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
};

/** Distance en km → "4,2 km" */
export const formatDistance = (km: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(km)} km`;
