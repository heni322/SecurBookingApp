// ─── Roles ────────────────────────────────────────────────────────────────────
export const UserRole = {
  CLIENT:  'CLIENT',
  AGENT:   'AGENT',
  PARTNER: 'PARTNER',
  ADMIN:   'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Statuts utilisateurs ─────────────────────────────────────────────────────
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

// ─── Candidatures ─────────────────────────────────────────────────────────────
export const ApplicationStatus = {
  PENDING:   'PENDING',
  ACCEPTED:  'ACCEPTED',
  REJECTED:  'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

// ─── Documents ────────────────────────────────────────────────────────────────
export const DocumentStatus = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED:  'EXPIRED',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DocumentType = {
  CARTE_PRO_CNAPS:              'CARTE_PRO_CNAPS',
  CIN:                          'CIN',
  PHOTO:                        'PHOTO',
  RIB:                          'RIB',
  CARTE_VITALE:                 'CARTE_VITALE',
  ATTESTATION_SECURITE_SOCIALE: 'ATTESTATION_SECURITE_SOCIALE',
  SST:                          'SST',
  MUTUELLE:                     'MUTUELLE',
  PERMIS_CONDUIRE:              'PERMIS_CONDUIRE',
  TFP_APS:                      'TFP_APS',
  SSIAP1:                       'SSIAP1',
  SSIAP2:                       'SSIAP2',
  SSIAP3:                       'SSIAP3',
  HOB0:                         'HOB0',
  BSBE:                         'BSBE',
  PSC1:                         'PSC1',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

// ─── Paiements ────────────────────────────────────────────────────────────────
export const PaymentStatus = {
  PENDING:  'PENDING',
  PAID:     'PAID',
  FAILED:   'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PayoutStatus = {
  SCHEDULED: 'SCHEDULED',
  PAID:      'PAID',
  FAILED:    'FAILED',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

// ─── Tarification ─────────────────────────────────────────────────────────────
export const PricingValueType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED:      'FIXED',
} as const;
export type PricingValueType = (typeof PricingValueType)[keyof typeof PricingValueType];

// ─── Clients ──────────────────────────────────────────────────────────────────
export const ClientType = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMPANY:    'COMPANY',
} as const;
export type ClientType = (typeof ClientType)[keyof typeof ClientType];
