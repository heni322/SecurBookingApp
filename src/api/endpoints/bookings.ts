import apiClient from '@api/client';
import type {
  ApiResponse,
  Booking,
  Incident,
  SelectAgentPayload,
  AssignAgentPayload,
  EligibleAgent,
  IncidentReportPayload,
} from '@models/index';

export const bookingsApi = {
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Booking[]>>(`/bookings/mission/${missionId}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`),

  /** [ADMIN] Picks an agent from existing applications. */
  selectAgent: (id: string, payload: SelectAgentPayload) =>
    apiClient.patch<ApiResponse<Booking>>(`/bookings/${id}/select-agent`, payload),

  /** [CLIENT] Assigns an agent directly without waiting for an application. */
  assignAgent: (id: string, payload: AssignAgentPayload) =>
    apiClient.post<ApiResponse<Booking>>(`/bookings/${id}/assign-agent`, payload),

  /** [CLIENT] List of eligible agents for this booking, with distance + R1-R4 status. */
  getEligibleAgents: (id: string) =>
    apiClient.get<ApiResponse<EligibleAgent[]>>(`/bookings/${id}/eligible-agents`),

  reportIncident: (id: string, payload: IncidentReportPayload) =>
    apiClient.post<ApiResponse<Incident>>(`/bookings/${id}/incident`, payload),
};
