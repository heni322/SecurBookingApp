/**
 * statusHelpers.ts — color maps by business status.
 *
 * Labels are intentionally NOT here — they live in the i18n namespaces
 * (missions.statuses, booking.*, payment.history.status) so they react
 * to locale changes automatically.
 *
 * Use the useMissionStatus() hook (or equivalent) to get both label + color.
 */
import { colors } from '@theme/colors';
import { MissionStatus, BookingStatus, DocumentStatus, PaymentStatus } from '@constants/enums';

// ── Mission ───────────────────────────────────────────────────────────────────
export const MISSION_STATUS_COLOR: Record<string, string> = {
  [MissionStatus.CREATED]:     colors.textMuted,
  [MissionStatus.PUBLISHED]:   colors.primary,
  [MissionStatus.STAFFING]:    colors.info,
  [MissionStatus.STAFFED]:     colors.info,
  [MissionStatus.IN_PROGRESS]: colors.warning,
  [MissionStatus.COMPLETED]:   colors.success,
  [MissionStatus.CANCELLED]:   colors.danger,
};

// ── Booking ───────────────────────────────────────────────────────────────────
export const BOOKING_STATUS_COLOR: Record<string, string> = {
  [BookingStatus.OPEN]:        colors.primary,
  [BookingStatus.ASSIGNED]:    colors.info,
  [BookingStatus.IN_PROGRESS]: colors.warning,
  [BookingStatus.COMPLETED]:   colors.success,
  [BookingStatus.CANCELLED]:   colors.danger,
  [BookingStatus.ABANDONED]:   colors.textMuted,
};

// ── Document ──────────────────────────────────────────────────────────────────
export const DOCUMENT_STATUS_COLOR: Record<string, string> = {
  [DocumentStatus.PENDING]:  colors.warning,
  [DocumentStatus.APPROVED]: colors.success,
  [DocumentStatus.REJECTED]: colors.danger,
  [DocumentStatus.EXPIRED]:  colors.textMuted,
};

// ── Payment ───────────────────────────────────────────────────────────────────
export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  [PaymentStatus.PENDING]:    colors.warning,
  [PaymentStatus.PROCESSING]: colors.info,
  [PaymentStatus.PAID]:       colors.success,
  [PaymentStatus.FAILED]:     colors.danger,
  [PaymentStatus.REFUNDED]:   colors.info,
};
