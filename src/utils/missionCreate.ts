/**
 * Pure helpers for the Create Mission flow (extracted from
 * MissionCreateScreen so they can be unit-tested).
 */

/** 'YYYY-MM-DD' of an instant on the Paris calendar. */
export const parisDay = (d: Date): string =>
  new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);

/**
 * Same calendar day in Paris as `now` — the API's (priced) notion of an
 * urgent mission (MissionsService.isToday, web create-payload.ts).
 */
export function isTodayInParis(iso: string, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && parisDay(d) === parisDay(now);
}

/**
 * Stable API error key → the Create Mission step that can fix it
 * (1 = location, 2 = schedule & staffing). The API's I18nExceptionFilter
 * returns `key` (e.g. "missions.errors.slots_overlap") next to the
 * translated message; routing on it is locale-independent, unlike matching
 * words in the message.
 */
export function stepForApiKey(key: string | null | undefined): 1 | 2 | null {
  if (!key) return null;
  if (/location|address|city|zip|latitude|longitude/.test(key)) return 1;
  if (/slot|service|booking|duration|first_slot|overlap|agent/.test(key)) return 2;
  return null;
}
