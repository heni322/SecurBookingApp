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


// =============================================================================
// PARTNER & EMPLOYMENT EXTENSIONS
// =============================================================================
// Ported from AgentSecurBookApp during the enterprise migration. These tables
// are consumed by the partner screens (status pills, document chip labels,
// compliance progress, uniform badges) and the employment flow.
// =============================================================================

import { MissionStatus as MS, BookingStatus as BS, DocumentStatus as DS, PayoutStatus as PS } from '@constants/enums';

// ─── Status labels (FR) ───────────────────────────────────────────────────────
// Color maps for these statuses are already exported above; only labels are added.
export const MISSION_STATUS_LABEL: Record<string, string> = {
  [MS.CREATED]:     'Brouillon',
  [MS.PUBLISHED]:   'Publiée',
  [MS.STAFFING]:    'Recherche agents',
  [MS.STAFFED]:     'Agents affectés',
  [MS.IN_PROGRESS]: 'En cours',
  [MS.COMPLETED]:   'Terminée',
  [MS.CANCELLED]:   'Annulée',
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  [BS.OPEN]:        'Ouvert',
  [BS.ASSIGNED]:    'Assigné',
  [BS.IN_PROGRESS]: 'En mission',
  [BS.COMPLETED]:   'Terminé',
  [BS.CANCELLED]:   'Annulé',
  [BS.ABANDONED]:   'Abandonné',
};

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  [DS.PENDING]:  'En attente',
  [DS.APPROVED]: 'Approuvé',
  [DS.REJECTED]: 'Rejeté',
  [DS.EXPIRED]:  'Expiré',
};

// ─── Payouts (J+15 cycle) ─────────────────────────────────────────────────────
import { colors as _c } from '@theme/colors';

export const PAYOUT_STATUS_LABEL: Record<string, string> = {
  [PS.SCHEDULED]:  'Programmé',
  [PS.PROCESSING]: 'En cours',
  [PS.PAID]:       'Payé',
  [PS.FAILED]:     'Échoué',
};

export const PAYOUT_STATUS_COLOR: Record<string, string> = {
  [PS.SCHEDULED]:  _c.accent,
  [PS.PROCESSING]: _c.warning,
  [PS.PAID]:       _c.success,
  [PS.FAILED]:     _c.danger,
};

// ─── Documents (PROFIL-DOCUMENTS.xlsx — both Agent and Partenaire sheets) ─────
export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  // Agent — commun
  CARTE_PRO_CNAPS:              'Carte Pro CNAPS',
  CIN:                          "Carte d'identité",
  PHOTO:                        'Photo identité',
  RIB:                          'RIB',
  CARTE_VITALE:                 'Carte Vitale',
  ATTESTATION_SECURITE_SOCIALE: 'Attestation SS',
  SST:                          'SST',
  MUTUELLE:                     'Mutuelle',
  PERMIS_CONDUIRE:              'Permis de conduire',
  TFP_APS:                      'TFP APS',
  // Agent — formations
  SSIAP1:                       'SSIAP 1',
  SSIAP2:                       'SSIAP 2',
  SSIAP3:                       'SSIAP 3',
  HOB0:                         'HOB0',
  BSBE:                         'BSBE',
  PSC1:                         'PSC1',
  // Nouveaux types agent (xlsx)
  CV:                           'CV',
  VISITE_MEDICALE:              'Visite médicale',
  PHOTO_TENUE:                  'Photo en tenue',
  PHOTO_COSTUME:                'Photo en costume',
  PHOTO_TENUE_COMPLETE:         'Photo en tenue complète portée',
  CARTE_CHIEN:                  'Carte du chien',
  // Documents partenaire
  EXTRAIT_KBIS:                 'Extrait Kbis',
  AGREMENT_CNAPS_SOCIETE:       'Agrément CNAPS — société',
  AGREMENT_CNAPS_DIRIGEANT:     'Agrément CNAPS — dirigeant',
  ATTESTATION_URSSAF:           'Attestation URSSAF',
  ATTESTATION_FISCALE:          'Attestation fiscale',
  ATTESTATION_RC_PRO:           'Attestation RC pro',
  ATTESTATION_HONNEUR:          "Attestation sur l'honneur",
  GRILLE_TARIFAIRE:             'Grille tarifaire',
  CONTRAT_CADRE:                'Contrat cadre',
};

// ─── Compliance helpers (mirror backend list of obligatoires + RGPD biometrics) ─
export const MANDATORY_DOC_TYPES = [
  'CARTE_PRO_CNAPS',
  'CIN',
  'PHOTO',
  'RIB',
  'CARTE_VITALE',
  'SST',
] as const;

/** Documents nécessitant consentement RGPD art.9 (biométriques). */
export const BIOMETRIC_DOC_TYPES = ['PHOTO', 'PHOTO_TENUE', 'PHOTO_COSTUME', 'PHOTO_TENUE_COMPLETE'] as const;

export const MANDATORY_DOC_LABELS: Record<string, string> = {
  CARTE_PRO_CNAPS: 'Carte Pro CNAPS',
  CIN:             "Carte d'identité",
  PHOTO:           'Photo / Selfie KYC',
  RIB:             'RIB bancaire',
  CARTE_VITALE:    'Carte Vitale',
  SST:             'Certificat SST',
};

export const MANDATORY_DOC_DESC: Record<string, string> = {
  CARTE_PRO_CNAPS: 'Obligatoire légalement — Loi n°83-629 du 12 juillet 1983',
  CIN:             'Vérification identité (KYC) — RGPD art.6(1)(c)',
  PHOTO:           'Selfie de vérification — données biométriques RGPD art.9',
  RIB:             'Pour virement J+15 après mission',
  CARTE_VITALE:    'Attestation sécurité sociale obligatoire',
  SST:             'Sauveteur Secouriste du Travail — obligation légale',
};

export const COMPLIANCE_STATUS_LABEL: Record<string, string> = {
  MISSING:  'À fournir',
  PENDING:  'En vérification',
  APPROVED: 'Validé',
  REJECTED: 'Rejeté',
  EXPIRED:  'Expiré',
};

export const COMPLIANCE_STATUS_COLOR: Record<string, string> = {
  MISSING:  '#94a3b8',
  PENDING:  '#bc933b',
  APPROVED: '#34d399',
  REJECTED: '#f87171',
  EXPIRED:  '#94a3b8',
};

// ─── Uniforms (mission card / detail dress-code badges) ───────────────────────
export const UNIFORM_LABEL: Record<string, string> = {
  STANDARD:     'Tenue standard',
  CIVIL:        'Tenue civile',
  EVENEMENTIEL: 'Événementiel',
  SSIAP:        'Tenue SSIAP (incendie)',
  CYNOPHILE:    'Cynophile (maître-chien)',
};

export const UNIFORM_LABEL_SHORT: Record<string, string> = {
  STANDARD:     'Standard',
  CIVIL:        'Civile',
  EVENEMENTIEL: 'Événementiel',
  SSIAP:        'SSIAP',
  CYNOPHILE:    'Cynophile',
};
