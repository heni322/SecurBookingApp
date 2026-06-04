/**
 * typeGuards.ts — helpers typés pour remplacer les `as any`
 * dans les comparaisons de statut enum.
 */
import { MissionStatus, BookingStatus } from '@constants/enums';
import type { Mission, Booking } from '@models/index';

// ── Mission ───────────────────────────────────────────────────────────────────
type MissionStatusValue = (typeof MissionStatus)[keyof typeof MissionStatus];

export const isMissionStatus = (
  status: string,
  ...values: MissionStatusValue[]
): boolean => values.includes(status as MissionStatusValue);

export const isActiveMission = (m: Mission): boolean =>
  isMissionStatus(
    m.status,
    MissionStatus.CREATED,
  MissionStatus.PUBLISHED,
  MissionStatus.STAFFING,
  MissionStatus.STAFFED,
  MissionStatus.IN_PROGRESS,
  );

/**
 * Real time window of a mission. For multi-slot missions the window spans from
 * the earliest slot start to the latest slot end; otherwise it uses the
 * mission's own startAt/endAt. Returns epoch ms (NaN-safe: invalid -> 0).
 */
export const missionWindow = (m: Mission): { start: number; end: number } => {
  const ts = (s?: string): number => {
    const n = s ? new Date(s).getTime() : NaN;
    return isNaN(n) ? 0 : n;
  };
  if (m.slots && m.slots.length > 0) {
    const starts = m.slots.map(sl => ts(sl.startAt)).filter(n => n > 0);
    const ends   = m.slots.map(sl => ts(sl.endAt)).filter(n => n > 0);
    if (starts.length > 0 && ends.length > 0) {
      return { start: Math.min(...starts), end: Math.max(...ends) };
    }
  }
  return { start: ts(m.startAt), end: ts(m.endAt) };
};

/**
 * "Ongoing now" — the mission is genuinely happening at this moment.
 * True when the server marks it IN_PROGRESS, OR when it is prepared
 * (STAFFED/STAFFING/PUBLISHED) and the current time falls inside its window.
 * A freshly created mission that starts in several days is NOT ongoing.
 */
export const isOngoingMission = (m: Mission, now: number = Date.now()): boolean => {
  if (isMissionStatus(m.status, MissionStatus.IN_PROGRESS)) return true;
  if (!isMissionStatus(
    m.status,
    MissionStatus.PUBLISHED,
    MissionStatus.STAFFING,
    MissionStatus.STAFFED,
  )) return false;
  const { start, end } = missionWindow(m);
  return start > 0 && end > 0 && now >= start && now <= end;
};

/**
 * "Upcoming" — active and scheduled to start in the future (not yet ongoing,
 * not finished). Used to surface the next mission without mislabelling it as
 * in-progress.
 */
export const isUpcomingMission = (m: Mission, now: number = Date.now()): boolean => {
  if (!isActiveMission(m)) return false;
  if (isMissionStatus(m.status, MissionStatus.IN_PROGRESS)) return false;
  const { start } = missionWindow(m);
  return start > 0 && start > now;
};

// Client can cancel at CREATED or PUBLISHED (not yet staffed)
export const isCancellableMission = (m: Mission): boolean =>
  isMissionStatus(m.status, MissionStatus.CREATED, MissionStatus.PUBLISHED, MissionStatus.STAFFING);

// ── Booking ───────────────────────────────────────────────────────────────────
type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus];

export const isBookingStatus = (
  status: string,
  ...values: BookingStatusValue[]
): boolean => values.includes(status as BookingStatusValue);

export const isActiveBooking = (b: Booking): boolean =>
  isBookingStatus(b.status, BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS);
