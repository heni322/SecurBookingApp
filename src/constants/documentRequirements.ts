/**
 * Document requirements per agent profile + per partner.
 *
 * Source of truth: PROFIL-DOCUMENTS.xlsx
 *   - Onglet "Agents"     -> AGENT_DOCUMENT_REQUIREMENTS
 *   - Onglet "Partenaire" -> PARTNER_DOCUMENT_REQUIREMENTS
 *
 * Mirror of backend src/common/constants/document-requirements.config.ts.
 * Used by the mobile app to display the right document checklist per profile,
 * gate the registration flow, and render the compliance UI.
 */

import { DocumentType, AgentProfileType } from './enums';

export interface DocumentRequirementSet {
  /** Documents that block compliance until APPROVED. */
  mandatory: DocumentType[];
  /** Documents the agent/partner CAN provide but is not required to. */
  optional: DocumentType[];
}

// --- Agent ------------------------------------------------------------------

const AGENT_COMMON_MANDATORY: DocumentType[] = [
  DocumentType.CARTE_PRO_CNAPS,    // "Carte professionnelle"
  DocumentType.CARTE_VITALE,
  DocumentType.CIN,                // "Document d'identité"
  DocumentType.SST,
];

const AGENT_COMMON_OPTIONAL: DocumentType[] = [
  DocumentType.RIB,
  DocumentType.CV,
  DocumentType.VISITE_MEDICALE,
];

export const AGENT_DOCUMENT_REQUIREMENTS: Record<AgentProfileType, DocumentRequirementSet> = {
  // 1. Agent de sécurité — Photo en tenue complète portée
  [AgentProfileType.SECURITE]: {
    mandatory: [...AGENT_COMMON_MANDATORY, DocumentType.PHOTO_TENUE_COMPLETE],
    optional:  [...AGENT_COMMON_OPTIONAL],
  },
  // 2. Agent de sécurité luxe — Photo en costume
  [AgentProfileType.SECURITE_LUXE]: {
    mandatory: [...AGENT_COMMON_MANDATORY, DocumentType.PHOTO_COSTUME],
    optional:  [...AGENT_COMMON_OPTIONAL],
  },
  // 3. Agent de sécurité incendie — Photo en costume + SSIAP1, optional H0B0
  [AgentProfileType.SECURITE_INCENDIE]: {
    mandatory: [...AGENT_COMMON_MANDATORY, DocumentType.PHOTO_COSTUME, DocumentType.SSIAP1],
    optional:  [...AGENT_COMMON_OPTIONAL, DocumentType.HOB0],
  },
  // 4. Chef d'équipe sécurité incendie — Photo en costume + SSIAP2, optional H0B0
  [AgentProfileType.CHEF_EQUIPE_INCENDIE]: {
    mandatory: [...AGENT_COMMON_MANDATORY, DocumentType.PHOTO_COSTUME, DocumentType.SSIAP2],
    optional:  [...AGENT_COMMON_OPTIONAL, DocumentType.HOB0],
  },
  // 5. Agent cynophile — Photo en tenue + Carte chien
  [AgentProfileType.CYNOPHILE]: {
    mandatory: [...AGENT_COMMON_MANDATORY, DocumentType.PHOTO_TENUE, DocumentType.CARTE_CHIEN],
    optional:  [...AGENT_COMMON_OPTIONAL],
  },
  // 6. Garde du corps (SAPR) — Photo en tenue complète portée
  [AgentProfileType.GARDE_DU_CORPS_SAPR]: {
    mandatory: [...AGENT_COMMON_MANDATORY, DocumentType.PHOTO_TENUE_COMPLETE],
    optional:  [...AGENT_COMMON_OPTIONAL],
  },
};

// --- Partner ----------------------------------------------------------------

export const PARTNER_DOCUMENT_REQUIREMENTS: DocumentRequirementSet = {
  mandatory: [
    DocumentType.EXTRAIT_KBIS,
    DocumentType.AGREMENT_CNAPS_SOCIETE,
    DocumentType.AGREMENT_CNAPS_DIRIGEANT,
    DocumentType.ATTESTATION_URSSAF,
    DocumentType.ATTESTATION_FISCALE,
    DocumentType.ATTESTATION_RC_PRO,
  ],
  optional: [
    DocumentType.ATTESTATION_HONNEUR,
    DocumentType.RIB,
    DocumentType.GRILLE_TARIFAIRE,
    DocumentType.CONTRAT_CADRE,
  ],
};

// --- Helpers ----------------------------------------------------------------

export function getAgentRequirements(profileType: AgentProfileType): DocumentRequirementSet {
  return AGENT_DOCUMENT_REQUIREMENTS[profileType] ?? AGENT_DOCUMENT_REQUIREMENTS[AgentProfileType.SECURITE];
}

export function getAgentMandatoryTypes(profileType: AgentProfileType): DocumentType[] {
  return getAgentRequirements(profileType).mandatory;
}

export function getAgentOptionalTypes(profileType: AgentProfileType): DocumentType[] {
  return getAgentRequirements(profileType).optional;
}

// --- Labels (UI display) ----------------------------------------------------

export const AGENT_PROFILE_TYPE_LABELS: Record<AgentProfileType, string> = {
  [AgentProfileType.SECURITE]:             'Agent de sécurité',
  [AgentProfileType.SECURITE_LUXE]:        'Agent de sécurité luxe',
  [AgentProfileType.SECURITE_INCENDIE]:    'Agent de sécurité incendie',
  [AgentProfileType.CHEF_EQUIPE_INCENDIE]: "Chef d'équipe sécurité incendie",
  [AgentProfileType.CYNOPHILE]:            'Agent cynophile',
  [AgentProfileType.GARDE_DU_CORPS_SAPR]:  'Garde du corps (SAPR)',
};

export const AGENT_PROFILE_TYPE_DESCRIPTIONS: Record<AgentProfileType, string> = {
  [AgentProfileType.SECURITE]:             'Surveillance générale, gardiennage de site, contrôle d\'accès.',
  [AgentProfileType.SECURITE_LUXE]:        'Hôtels haut de gamme, boutiques de luxe, événements VIP. Tenue costume.',
  [AgentProfileType.SECURITE_INCENDIE]:    'IGH, ERP. Diplôme SSIAP1 requis.',
  [AgentProfileType.CHEF_EQUIPE_INCENDIE]: 'Encadrement équipe sécurité incendie. Diplôme SSIAP2 requis.',
  [AgentProfileType.CYNOPHILE]:            'Patrouille avec chien. Carte du chien requise.',
  [AgentProfileType.GARDE_DU_CORPS_SAPR]:  'Protection rapprochée de personnes. Formation SAPR.',
};

export const DOCUMENT_TYPE_LABELS: Partial<Record<DocumentType, string>> = {
  // Agent
  [DocumentType.CARTE_PRO_CNAPS]:              'Carte professionnelle CNAPS',
  [DocumentType.CIN]:                          "Document d'identité",
  [DocumentType.PHOTO]:                        'Photo',
  [DocumentType.PHOTO_TENUE]:                  'Photo en tenue',
  [DocumentType.PHOTO_COSTUME]:                'Photo en costume',
  [DocumentType.PHOTO_TENUE_COMPLETE]:         'Photo en tenue complète portée',
  [DocumentType.RIB]:                          'RIB',
  [DocumentType.CARTE_VITALE]:                 'Carte vitale',
  [DocumentType.SST]:                          'SST',
  [DocumentType.CV]:                           'CV',
  [DocumentType.VISITE_MEDICALE]:              'Visite médicale',
  [DocumentType.SSIAP1]:                       'SSIAP1',
  [DocumentType.SSIAP2]:                       'SSIAP2',
  [DocumentType.SSIAP3]:                       'SSIAP3',
  [DocumentType.HOB0]:                         'H0B0',
  [DocumentType.CARTE_CHIEN]:                  'Carte du chien',
  // Partner
  [DocumentType.EXTRAIT_KBIS]:                 'Extrait Kbis',
  [DocumentType.AGREMENT_CNAPS_SOCIETE]:       'Agrément CNAPS — société',
  [DocumentType.AGREMENT_CNAPS_DIRIGEANT]:     'Agrément CNAPS — dirigeant',
  [DocumentType.ATTESTATION_URSSAF]:           'Attestation URSSAF',
  [DocumentType.ATTESTATION_FISCALE]:          'Attestation fiscale',
  [DocumentType.ATTESTATION_RC_PRO]:           'Attestation responsabilité civile pro',
  [DocumentType.ATTESTATION_HONNEUR]:          "Attestation sur l'honneur",
  [DocumentType.GRILLE_TARIFAIRE]:             'Grille tarifaire',
  [DocumentType.CONTRAT_CADRE]:                'Contrat cadre',
};

export function labelForDocument(t: string): string {
  return DOCUMENT_TYPE_LABELS[t as DocumentType] ?? t.replace(/_/g, ' ');
}

export function labelForProfileType(t: AgentProfileType): string {
  return AGENT_PROFILE_TYPE_LABELS[t] ?? t;
}
