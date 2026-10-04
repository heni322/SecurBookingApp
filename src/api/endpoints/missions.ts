import apiClient from '@api/client';
import type {
  ApiResponse, Mission, CreateMissionPayload, UpdateMissionPayload,
} from '@models/index';

/**
 * Missions API — paths MUST mirror the NestJS controller at
 * provalk-api/src/modules/missions/controllers/missions.controller.ts.
 *
 * The backend uses a `verb/:id` route shape (e.g. `get/:id`, `cancel/:id`)
 * — NOT the REST-y `:id/verb` shape. Mismatches here surface as 404.
 *
 * `my`, `posted`, `nearby` are static paths that exist as-is on the backend.
 *
 * Mission scope filter:
 *   - ACTIVE   → CREATED / PUBLISHED / STAFFING / STAFFED / IN_PROGRESS
 *   - ARCHIVED → COMPLETED / CANCELLED
 *   - omitted  → all
 */
export type MissionScope = 'ACTIVE' | 'ARCHIVED';

/**
 * PATCH /missions/update/:id/slots/:slotId payload.
 *
 * FIX (audit 2026-08, P1-5): this used to declare `bookingLines`, which the
 * endpoint has never handled. The server's body was an inline TypeScript type,
 * so ValidationPipe had no metadata to validate against and silently discarded
 * the field — returning 200 while doing nothing. The backend now uses a real
 * DTO and rejects unknown properties with 400, so this type must match it.
 *
 * Staffing (bookingLines) is fixed at mission creation. It is intentionally not
 * editable per-slot: changing agentCount after publication would invalidate the
 * quote, employment contracts and DPAE declarations derived from it.
 */
export interface UpdateSlotPayload {
  startAt?: string;
  endAt?:   string;
  notes?:   string;
}

export const missionsApi = {
  // ── Read ────────────────────────────────────────────────────────────────

  /** GET /missions/nearby — missions publiées dans le rayon GPS de l'agent. */
  getNearby: () =>
    apiClient.get<ApiResponse<Mission[]>>('/missions/nearby'),

  /** GET /missions/get/:id — détail (role-scoped read). */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Mission>>(`/missions/get/${id}`),

  /**
   * GET /missions/my — missions liées au compte courant.
   *   - AGENT   : missions sur lesquelles il est staffé
   *   - PARTNER : missions effectuées par les agents de sa société
   *   - CLIENT  : missions qu'il a publiées
   */
  getMyMissions: (scope?: MissionScope) =>
    apiClient.get<ApiResponse<Mission[]>>('/missions/my', { params: { scope } }),

  /** Alias of getMyMissions — preferred name in the partner module (back-compat). */
  getMine: (scope?: MissionScope) =>
    apiClient.get<ApiResponse<Mission[]>>('/missions/my', { params: { scope } }),

  /**
   * GET /missions/posted — missions publiées par le compte courant en tant que
   * donneur d'ordre.
   *   - CLIENT  : ses propres missions
   *   - PARTNER : missions publiées par sa société (le partenaire agit comme client final)
   */
  getPosted: (scope?: MissionScope) =>
    apiClient.get<ApiResponse<Mission[]>>('/missions/posted', { params: { scope } }),

  // ── Write ───────────────────────────────────────────────────────────────

  /**
   * POST /missions/create — créer une mission.
   *   - CLIENT  : rattachée automatiquement à son profil client (clientId ignoré)
   *   - PARTNER : rattachée automatiquement au profil client du partenaire — le
   *               partenaire agit comme client final. Le backend auto-provisionne
   *               un profil client si le compte n'en a pas encore.
   * Règles métier : durée minimum 6h par créneau (obligation légale),
   * startAt au moins 1h dans le futur.
   */
  create: (payload: CreateMissionPayload) =>
    apiClient.post<ApiResponse<Mission>>('/missions/create', payload),

  /** PATCH /missions/update/:id — modifier (PARTNER, CLIENT, ADMIN). */
  update: (id: string, payload: UpdateMissionPayload) =>
    apiClient.patch<ApiResponse<Mission>>(`/missions/update/${id}`, payload),

  /**
   * PATCH /missions/cancel/:id — annuler.
   *   - CLIENT/PARTNER : possible en CREATED, PUBLISHED ou STAFFING
   *   - ADMIN          : possible à tout stade
   */
  cancel: (id: string) =>
    apiClient.patch<ApiResponse<Mission>>(`/missions/cancel/${id}`),

  // NOTE (audit 2026-08, P1-7): `publish` and `getEvents` were removed. Both
  // map to routes the backend gates with @Roles(ADMIN), so from this client app
  // they could only ever return 403, and neither was called anywhere in src/.
  // Mission publication is payment-driven server-side (confirmOfflinePayment
  // and the Stripe webhook transition CONFIRMED -> PUBLISHED), so there is no
  // client-side publish step to wire up.

  // ── Slots & history ─────────────────────────────────────────────────────

  /** GET /missions/get/:id/slots — créneaux horaires. */
  getSlots: (id: string) =>
    apiClient.get<ApiResponse<any[]>>(`/missions/get/${id}/slots`),

  /** PATCH /missions/update/:id/slots/:slotId — modifier un créneau. */
  updateSlot: (id: string, slotId: string, payload: UpdateSlotPayload) =>
    apiClient.patch<ApiResponse<any>>(`/missions/update/${id}/slots/${slotId}`, payload),

  /** GET /missions/get/:id/history — historique des changements de statut. */
  getHistory: (id: string) =>
    apiClient.get<ApiResponse<any[]>>(`/missions/get/${id}/history`),
};
