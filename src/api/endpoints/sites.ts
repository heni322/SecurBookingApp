import apiClient from '../client';
import type { ApiResponse } from '@models/index';

/**
 * Sites API — consignes de site (lot 3, audit 2026-08).
 *
 * Remplace le contournement par `Mission.notes` : un champ texte de 1000
 * caractères dans lequel le client devait faire tenir accès, clés, codes,
 * contacts et astreintes — et qui n'était même pas affiché côté agent.
 *
 * ⚠️  Les VALEURS des codes d'accès n'apparaissent dans aucune réponse de
 * lecture. Elles entrent par `createSecret`/`rotateSecret`, sont chiffrées
 * AES-256-GCM côté serveur, et ne ressortent que par une révélation
 * explicitement journalisée.
 */

export type SiteContactRole =
  | 'REMISE_CLES'
  | 'RETOUR_CLES'
  | 'ASTREINTE'
  | 'HIERARCHIE'
  | 'DONNEUR_ORDRES'
  | 'TECHNIQUE'
  | 'AUTRE';

export type SiteSecretKind =
  | 'BOITE_CLES'
  | 'ALARME'
  | 'CADENAS'
  | 'BADGE'
  | 'INTERPHONE'
  | 'AUTRE';

export interface SitePost {
  id: string;
  label: string;
  serviceTypeId?: string | null;
  specifications?: string | null;
  headcount: number;
  displayOrder: number;
}

export interface SiteContact {
  id: string;
  role: SiteContactRole;
  name: string;
  phone?: string | null;
  email?: string | null;
  availability?: string | null;
  note?: string | null;
  displayOrder: number;
}

export interface Site {
  id: string;
  clientId: string;
  label: string;
  address: string;
  city: string;
  zipCode: string;
  accessInstructions?: string | null;
  particularExpectations?: string | null;
  /**
   * Incrémenté à chaque modification des CONSIGNES (pas du libellé ni de
   * l'adresse). Invalide les acquittements des agents : ils devront
   * réacquitter avant leur prochaine prise de service.
   */
  briefingVersion: number;
  isActive: boolean;
  posts?: SitePost[];
  contacts?: SiteContact[];
  _count?: { posts: number; contacts: number; secrets: number };
}

/** Métadonnées d'un code — jamais sa valeur. */
export interface SiteSecretMeta {
  id: string;
  kind: SiteSecretKind;
  label: string;
  validFrom?: string | null;
  validUntil?: string | null;
  rotatedAt: string;
  isCurrentlyValid: boolean;
  /** Code non renouvelé depuis plus de six mois. */
  staleRotation: boolean;
}

export interface SecretAccessEntry {
  id: string;
  userId: string;
  bookingId?: string | null;
  ipAddress?: string | null;
  at: string;
}

export interface CreateSitePayload {
  label: string;
  address: string;
  city: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  /** Moyens d'accès NON secrets. Les codes vont dans les secrets. */
  accessInstructions?: string;
  particularExpectations?: string;
}

export const sitesApi = {
  /** GET /sites/client/:clientId */
  listForClient: (clientId: string) =>
    apiClient.get<ApiResponse<Site[]>>(`/sites/client/${clientId}`),

  /** GET /sites/:id — consignes, postes et contacts. Sans les codes. */
  getById: (id: string) => apiClient.get<ApiResponse<Site>>(`/sites/${id}`),

  /** POST /sites */
  create: (payload: CreateSitePayload) =>
    apiClient.post<ApiResponse<Site>>('/sites', payload),

  /**
   * PATCH /sites/:id
   *
   * Modifier `accessInstructions` ou `particularExpectations` incrémente
   * `briefingVersion` et oblige les agents à réacquitter les consignes.
   * Renommer le site ou corriger un code postal ne le fait pas.
   */
  update: (id: string, payload: Partial<CreateSitePayload> & { isActive?: boolean }) =>
    apiClient.patch<ApiResponse<Site>>(`/sites/${id}`, payload),

  // ── Postes ────────────────────────────────────────────────────────────────

  addPost: (
    siteId: string,
    payload: {
      label: string;
      serviceTypeId?: string;
      /** Tâches concrètes : rondes horaires, filtrage, contrôle d'accès. */
      specifications?: string;
      headcount?: number;
      displayOrder?: number;
    },
  ) => apiClient.post<ApiResponse<SitePost>>(`/sites/${siteId}/posts`, payload),

  removePost: (postId: string) =>
    apiClient.delete<ApiResponse<unknown>>(`/sites/posts/${postId}`),

  // ── Contacts ──────────────────────────────────────────────────────────────

  addContact: (
    siteId: string,
    payload: {
      role: SiteContactRole;
      name: string;
      phone?: string;
      email?: string;
      /** Créneaux de joignabilité : « 20h-6h en semaine ». */
      availability?: string;
      note?: string;
      displayOrder?: number;
    },
  ) => apiClient.post<ApiResponse<SiteContact>>(`/sites/${siteId}/contacts`, payload),

  removeContact: (contactId: string) =>
    apiClient.delete<ApiResponse<unknown>>(`/sites/contacts/${contactId}`),

  // ── Codes d'accès ─────────────────────────────────────────────────────────

  /** GET /sites/:id/secrets — métadonnées uniquement, jamais les valeurs. */
  listSecrets: (siteId: string) =>
    apiClient.get<ApiResponse<SiteSecretMeta[]>>(`/sites/${siteId}/secrets`),

  /**
   * POST /sites/:id/secrets
   *
   * La valeur est chiffrée avant écriture et n'est PAS renvoyée par la
   * réponse — même à celui qui vient de la saisir.
   */
  createSecret: (
    siteId: string,
    payload: {
      kind: SiteSecretKind;
      label: string;
      value: string;
      validFrom?: string;
      validUntil?: string;
    },
  ) => apiClient.post<ApiResponse<SiteSecretMeta>>(`/sites/${siteId}/secrets`, payload),

  /** PATCH /sites/secrets/:id/rotate — remplace la valeur EN PLACE. */
  rotateSecret: (secretId: string, value: string) =>
    apiClient.patch<ApiResponse<SiteSecretMeta>>(
      `/sites/secrets/${secretId}/rotate`,
      { value },
    ),

  /**
   * GET /sites/secrets/:id/access-log
   *
   * Qui a consulté ce code, quand, et au titre de quelle vacation. Sans ce
   * journal, une fuite serait indétectable et inexplicable.
   */
  secretAccessLog: (secretId: string, limit = 50) =>
    apiClient.get<ApiResponse<SecretAccessEntry[]>>(
      `/sites/secrets/${secretId}/access-log`,
      { params: { limit } },
    ),
};
