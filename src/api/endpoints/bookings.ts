import apiClient from '@api/client';
import type {
  ApiResponse,
  Booking,
  Incident,
  IncidentReportPayload,
} from '@models/index';

/**
 * URLs alignées sur la convention backend :
 *   /bookings/list/mission/:id   /bookings/get/:id   ...
 *
 * Note: CLIENTS never pick agents (an agent applying via POST /bookings/apply
 * is assigned first come, first served). PARTNERS assign their own agents
 * through `staffingApi` below (2026-10-07).
 */
export const bookingsApi = {
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Booking[]>>(`/bookings/list/mission/${missionId}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Booking>>(`/bookings/get/${id}`),

  reportIncident: (id: string, payload: IncidentReportPayload) =>
    apiClient.post<ApiResponse<Incident>>(`/bookings/incident/${id}`, payload),
};

// ── Partner staffing (2026-10-07) — same API as web /partner/staffing ────────
// The queue is open: partner companies compete to staff paid posts, each
// placing ITS OWN agents. selectAgent() authorises on the TARGETED AGENT
// (must belong to the caller's company), not on the booking.

/** One open post (the row IS the booking). Mirrors GET /bookings/staffing. */
export interface StaffingRow {
  id: string;
  bookingId: string;
  status: string;
  uniform: string | null;
  serviceType: { id: string; name: string; category: string } | null;
  slot: { slotId: string; slotIndex: number; startAt: string; endAt: string; durationHours: number | null } | null;
  missionId: string;
  mission: {
    id: string; title: string | null; status: string | null;
    address: string | null; city: string | null; zipCode: string | null;
    startAt: string | null; endAt: string | null; durationHours: number | null;
    isUrgent: boolean;
  };
  effectif: { requested: number; assigned: number; staffing: 'UNSTAFFED' | 'PARTIAL' | 'COMPLETE' };
}

/** Mirrors EligibleAgentResponseDto. `canBeAssigned` alone decides. */
export interface EligibleAgent {
  id: string;
  fullName: string;
  avatarUrl?: string;
  avgRating: number;
  completedCount: number;
  isValidated: boolean;
  city?: string;
  distanceKm?: number;
  isFavorite: boolean;
  hasDeclaredAvailability: boolean;
  /** Human-readable reasons, already formatted by the API. */
  schedulingConflicts: string[];
  canBeAssigned: boolean;
}

export interface StaffingPage {
  data: StaffingRow[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export const staffingApi = {
  /** GET /bookings/staffing — PARTNER. */
  queue: (params: { city?: string; page?: number; limit?: number } = {}) =>
    apiClient.get<ApiResponse<StaffingPage>>('/bookings/staffing', { params }),

  /** GET /bookings/get/:id/eligible-agents — the caller's own agents for that post. */
  eligibleAgents: (bookingId: string) =>
    apiClient.get<ApiResponse<EligibleAgent[]>>(`/bookings/get/${bookingId}/eligible-agents`),

  /** PATCH /bookings/select-agent/:id — assigns; the contract is drafted + employer-presigned. */
  selectAgent: (bookingId: string, agentId: string) =>
    apiClient.patch<ApiResponse<unknown>>(`/bookings/select-agent/${bookingId}`, { agentId }),
};

/**
 * Same ordering as the web: assignable first, then the client's favourites,
 * then agents who declared availability, then distance, rating last — a
 * 4.9 forty kilometres away is worse than a 4.2 on the street for a night shift.
 */
export function byAssignability(a: EligibleAgent, b: EligibleAgent): number {
  if (a.canBeAssigned !== b.canBeAssigned) return a.canBeAssigned ? -1 : 1;
  if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
  if (a.hasDeclaredAvailability !== b.hasDeclaredAvailability) return a.hasDeclaredAvailability ? -1 : 1;
  const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
  const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return (b.avgRating ?? 0) - (a.avgRating ?? 0);
}
