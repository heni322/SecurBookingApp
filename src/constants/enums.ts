// ─── Roles ────────────────────────────────────────────────────────────────────
export const UserRole = {
  CLIENT: 'CLIENT',
  AGENT:  'AGENT',       // conservé pour lire le rôle retourné par l'API
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Statuts utilisateur ──────────────────────────────────────────────────────
export const UserStatus = {
  PENDING:   'PENDING',
  ACTIVE:    'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED:    'BANNED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// ─── Missions ─────────────────────────────────────────────────────────────────
export const MissionStatus = {
  DRAFT:       'DRAFT',
  CONFIRMED:   'CONFIRMED',
  PUBLISHED:   'PUBLISHED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  CANCELLED:   'CANCELLED',
} as const;
export type MissionStatus = (typeof MissionStatus)[keyof typeof MissionStatus];

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const BookingStatus = {
  OPEN:        'OPEN',
  ASSIGNED:    'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  CANCELLED:   'CANCELLED',
  ABANDONED:   'ABANDONED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

// ─── Paiements ────────────────────────────────────────────────────────────────
export const PaymentStatus = {
  PENDING:  'PENDING',
  PAID:     'PAID',
  FAILED:   'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ─── Clients ──────────────────────────────────────────────────────────────────
export const ClientType = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMPANY:    'COMPANY',
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];

// ─── Statuts de document (lecture seule côté client) ──────────────────────────
export const DocumentStatus = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED:  'EXPIRED',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
