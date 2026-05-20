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
 * Note: selectAgent / assignAgent / getEligibleAgents ont été retirés du
 * client mobile. L'assignation est automatique : quand un agent postule via
 * POST /bookings/apply/:id, il est immédiatement assigné (premier arrivé,
 * premier servi). Le flow "sélection manuelle d'agent" côté CLIENT n'existe
 * pas dans le backend (PARTNER/ADMIN uniquement).
 */
export const bookingsApi = {
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Booking[]>>(`/bookings/list/mission/${missionId}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Booking>>(`/bookings/get/${id}`),

  reportIncident: (id: string, payload: IncidentReportPayload) =>
    apiClient.post<ApiResponse<Incident>>(`/bookings/incident/${id}`, payload),
};
