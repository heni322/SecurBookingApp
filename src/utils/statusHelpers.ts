/**
 * statusHelpers.ts — labels et couleurs par statut métier
 */
import { colors } from '@theme/colors';
import { MissionStatus, BookingStatus, DocumentStatus, PaymentStatus } from '@constants/enums';

// ── Mission ───────────────────────────────────────────────────────────────────
export const MISSION_STATUS_LABEL: Record<string, string> = {
  [MissionStatus.DRAFT]:       'Brouillon',
  [MissionStatus.CONFIRMED]:   'Confirmée',
  [MissionStatus.PUBLISHED]:   'Publiée',
  [MissionStatus.IN_PROGRESS]: 'En cours',
  [MissionStatus.COMPLETED]:   'Terminée',
  [MissionStatus.CANCELLED]:   'Annulée',
};

export const MISSION_STATUS_COLOR: Record<string, string> = {
  [MissionStatus.DRAFT]:       colors.textMuted,
  [MissionStatus.CONFIRMED]:   colors.info,
  [MissionStatus.PUBLISHED]:   colors.primary,
  [MissionStatus.IN_PROGRESS]: colors.warning,
  [MissionStatus.COMPLETED]:   colors.success,
  [MissionStatus.CANCELLED]:   colors.danger,
};

// ── Booking ───────────────────────────────────────────────────────────────────
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  [BookingStatus.OPEN]:        'Ouvert',
  [BookingStatus.ASSIGNED]:    'Assigné',
  [BookingStatus.IN_PROGRESS]: 'En mission',
  [BookingStatus.COMPLETED]:   'Terminé',
  [BookingStatus.CANCELLED]:   'Annulé',
  [BookingStatus.ABANDONED]:   'Abandonné',
};

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  [BookingStatus.OPEN]:        colors.primary,
  [BookingStatus.ASSIGNED]:    colors.info,
  [BookingStatus.IN_PROGRESS]: colors.warning,
  [BookingStatus.COMPLETED]:   colors.success,
  [BookingStatus.CANCELLED]:   colors.danger,
  [BookingStatus.ABANDONED]:   colors.textMuted,
};

// ── Document ──────────────────────────────────────────────────────────────────
export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  [DocumentStatus.PENDING]:  'En attente',
  [DocumentStatus.APPROVED]: 'Approuvé',
  [DocumentStatus.REJECTED]: 'Rejeté',
  [DocumentStatus.EXPIRED]:  'Expiré',
};

export const DOCUMENT_STATUS_COLOR: Record<string, string> = {
  [DocumentStatus.PENDING]:  colors.warning,
  [DocumentStatus.APPROVED]: colors.success,
  [DocumentStatus.REJECTED]: colors.danger,
  [DocumentStatus.EXPIRED]:  colors.textMuted,
};

// ── Payment ───────────────────────────────────────────────────────────────────
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  [PaymentStatus.PENDING]:  'En attente',
  [PaymentStatus.PAID]:     'Payé',
  [PaymentStatus.FAILED]:   'Échoué',
  [PaymentStatus.REFUNDED]: 'Remboursé',
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  [PaymentStatus.PENDING]:  colors.warning,
  [PaymentStatus.PAID]:     colors.success,
  [PaymentStatus.FAILED]:   colors.danger,
  [PaymentStatus.REFUNDED]: colors.info,
};
