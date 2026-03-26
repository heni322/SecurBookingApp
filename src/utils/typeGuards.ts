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
    MissionStatus.CONFIRMED,
    MissionStatus.PUBLISHED,
    MissionStatus.IN_PROGRESS,
  );

export const isCancellableMission = (m: Mission): boolean =>
  isMissionStatus(m.status, MissionStatus.DRAFT, MissionStatus.CONFIRMED);

// ── Booking ───────────────────────────────────────────────────────────────────
type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus];

export const isBookingStatus = (
  status: string,
  ...values: BookingStatusValue[]
): boolean => values.includes(status as BookingStatusValue);

export const isActiveBooking = (b: Booking): boolean =>
  isBookingStatus(b.status, BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS);
