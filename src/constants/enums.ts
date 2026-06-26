// ─── Roles ────────────────────────────────────────────────────────────────────
// PARTNER + ADMIN added in enterprise migration: SecurBookingApp now hosts
// both the client experience and the partner (sécurité-société) experience,
// gated at RootNavigator by `user.role`. ADMIN is server-side only but kept
// in the enum so role checks against API payloads stay typesafe.
export const UserRole = {
  CLIENT:  'CLIENT',
  AGENT:   'AGENT',
  PARTNER: 'PARTNER',
  ADMIN:   'ADMIN',
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
  CREATED:     'CREATED',
  PUBLISHED:   'PUBLISHED',
  STAFFING:    'STAFFING',
  STAFFED:     'STAFFED',
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

// ─── Applications ─────────────────────────────────────────────────────────────
// Used by partner team management to track agent applications to missions.
export const ApplicationStatus = {
  PENDING:   'PENDING',
  ACCEPTED:  'ACCEPTED',
  REJECTED:  'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

// ─── Paiements ────────────────────────────────────────────────────────────────
// AUTHORIZED added — used by Stripe pre-auth flow on enterprise mission creation.
export const PaymentStatus = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  AUTHORIZED: 'AUTHORIZED',
  PAID:       'PAID',
  FAILED:     'FAILED',
  REFUNDED:   'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ─── Payouts (agent virements) ────────────────────────────────────────────────
// Synced with backend prisma/schema.prisma (PayoutStatus enum).
// PROCESSING is used by the J+15 payout scheduler cron.
export const PayoutStatus = {
  SCHEDULED:  'SCHEDULED',
  PROCESSING: 'PROCESSING',
  PAID:       'PAID',
  FAILED:     'FAILED',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

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

// ─── Tenue agent ──────────────────────────────────────────────────────────────
export const UniformType = {
  STANDARD:     'STANDARD',
  CIVIL:        'CIVIL',
  EVENEMENTIEL: 'EVENEMENTIEL',
  SSIAP:        'SSIAP',
  CYNOPHILE:    'CYNOPHILE',
} as const;
export type UniformType = (typeof UniformType)[keyof typeof UniformType];

// ─── DocumentType — mirror of backend src/common/constants/enums.ts ───────────
// Source: PROFIL-DOCUMENTS.xlsx (sheets "Agents" + "Partenaire").
// Used by partner compliance/document screens and by future agent onboarding.
export const DocumentType = {
  // -- Agent : commun --
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
  CV:                           'CV',
  VISITE_MEDICALE:              'VISITE_MEDICALE',
  // -- Agent : photos par profil --
  PHOTO_TENUE:                  'PHOTO_TENUE',
  PHOTO_COSTUME:                'PHOTO_COSTUME',
  PHOTO_TENUE_COMPLETE:         'PHOTO_TENUE_COMPLETE',
  // -- Agent : formations spécifiques --
  SSIAP1:                       'SSIAP1',
  SSIAP2:                       'SSIAP2',
  SSIAP3:                       'SSIAP3',
  HOB0:                         'HOB0',
  BSBE:                         'BSBE',
  PSC1:                         'PSC1',
  CARTE_CHIEN:                  'CARTE_CHIEN',
  // -- Partenaire --
  EXTRAIT_KBIS:                 'EXTRAIT_KBIS',
  AGREMENT_CNAPS_SOCIETE:       'AGREMENT_CNAPS_SOCIETE',
  AGREMENT_CNAPS_DIRIGEANT:     'AGREMENT_CNAPS_DIRIGEANT',
  ATTESTATION_URSSAF:           'ATTESTATION_URSSAF',
  ATTESTATION_FISCALE:          'ATTESTATION_FISCALE',
  ATTESTATION_RC_PRO:           'ATTESTATION_RC_PRO',
  ATTESTATION_HONNEUR:          'ATTESTATION_HONNEUR',
  GRILLE_TARIFAIRE:             'GRILLE_TARIFAIRE',
  CONTRAT_CADRE:                'CONTRAT_CADRE',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

// ─── AgentProfileType — sheet "Agents" of PROFIL-DOCUMENTS.xlsx ───────────────
export const AgentProfileType = {
  SECURITE:             'SECURITE',
  SECURITE_LUXE:        'SECURITE_LUXE',
  SECURITE_INCENDIE:    'SECURITE_INCENDIE',
  CHEF_EQUIPE_INCENDIE: 'CHEF_EQUIPE_INCENDIE',
  CYNOPHILE:            'CYNOPHILE',
  GARDE_DU_CORPS_SAPR:  'GARDE_DU_CORPS_SAPR',
} as const;
export type AgentProfileType = (typeof AgentProfileType)[keyof typeof AgentProfileType];

// ─── PartnerDocumentType — sheet "Partenaire" of PROFIL-DOCUMENTS.xlsx ────────
export const PartnerDocumentType = {
  EXTRAIT_KBIS:             'EXTRAIT_KBIS',
  AGREMENT_CNAPS_SOCIETE:   'AGREMENT_CNAPS_SOCIETE',
  AGREMENT_CNAPS_DIRIGEANT: 'AGREMENT_CNAPS_DIRIGEANT',
  ATTESTATION_URSSAF:       'ATTESTATION_URSSAF',
  ATTESTATION_FISCALE:      'ATTESTATION_FISCALE',
  ATTESTATION_RC_PRO:       'ATTESTATION_RC_PRO',
  ATTESTATION_HONNEUR:      'ATTESTATION_HONNEUR',
  RIB:                      'RIB',
  GRILLE_TARIFAIRE:         'GRILLE_TARIFAIRE',
  CONTRAT_CADRE:            'CONTRAT_CADRE',
} as const;
export type PartnerDocumentType = (typeof PartnerDocumentType)[keyof typeof PartnerDocumentType];

// ─── AgentCategory — SNEPS/IDCC-1351 classification (synced with backend) ─────
// Used by employment contract screens (CDD/CDI, salary preview, payslips).
export const AgentCategory = {
  AGENT_EXPLOITATION: 'AGENT_EXPLOITATION',
  AGENT_MAITRISE:     'AGENT_MAITRISE',
  CADRE:              'CADRE',
} as const;
export type AgentCategory = (typeof AgentCategory)[keyof typeof AgentCategory];
