/**
 * parisTime — mission times live in Paris time (product decision 2026-10-07).
 *
 * Every mission happens in France and the API prices it in Paris civil time
 * (night 21:00–06:00, weekends, public holidays — shared-kernel/calendar). The
 * app used to enter and show times in the PHONE's time zone, so a phone on
 * another zone (a partner abroad, a phone left on UTC) booked other hours than
 * it displayed: "08:00–20:00" on a UTC phone was 10:00–22:00 in Paris and was
 * quoted with a night surcharge. Found on the emulator, 2026-10-07.
 *
 * Rule: a mission time is ENTERED and SHOWN as Paris wall-clock time. An
 * instant (Date / ISO string) is unchanged; only the conversion to and from
 * calendar fields goes through Europe/Paris. Personal times (greeting, chat
 * timestamps) stay on the phone's clock.
 */
export const PARIS_TZ = 'Europe/Paris';

export interface ParisParts {
  year: number;
  /** 0–11, like Date#getMonth. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday, like Date#getDay. */
  weekday: number;
}

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: PARIS_TZ,
  hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  weekday: 'short',
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Calendar fields of an instant, as read on a clock in Paris. */
export function parisParts(d: Date): ParisParts {
  const map: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(d)) map[p.type] = p.value;
  const hour = Number(map.hour) % 24; // some engines print 24 for midnight
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekday: WEEKDAYS[map.weekday] ?? 0,
  };
}

/** Paris offset from UTC at that instant, in ms (+1 h winter, +2 h summer). */
function offsetMs(d: Date): number {
  const p = parisParts(d);
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute);
  return asUtc - Math.floor(d.getTime() / 60_000) * 60_000;
}

/**
 * The instant at which a Paris clock shows that date and time.
 * Month is 0-based; out-of-range days roll over like Date.UTC.
 * In the autumn repeated hour the earlier instant wins; a spring-gap time
 * (02:xx on the last Sunday of March) resolves to the hour after.
 */
export function fromParis(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const wall = Date.UTC(year, month, day, hour, minute);
  // The offsets in force half a day either side cover any DST change.
  const offBefore = offsetMs(new Date(wall - 12 * 3_600_000));
  const offAfter  = offsetMs(new Date(wall + 12 * 3_600_000));
  const reads = (t: number) => {
    const p = parisParts(new Date(t));
    return Date.UTC(p.year, p.month, p.day, p.hour, p.minute) === wall;
  };
  const valid = [wall - offBefore, wall - offAfter].filter(reads);
  if (valid.length > 0) return new Date(Math.min(...valid)); // repeated hour: earlier
  // Spring gap (the clock jumps over this time): the same minutes, one hour later.
  return new Date(wall - Math.min(offBefore, offAfter));
}

/** Days in a calendar month (month 0-based), time-zone independent. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Weekday (0 = Sunday) of a calendar date, time-zone independent. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

/** Same calendar day in Paris. */
export function sameParisDay(a: Date, b: Date): boolean {
  const x = parisParts(a), y = parisParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** Intl options with the Paris zone added — for mission dates and times. */
export const inParis = <T extends Intl.DateTimeFormatOptions>(opts: T): T & { timeZone: string } =>
  ({ ...opts, timeZone: PARIS_TZ });
