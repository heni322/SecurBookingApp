import apiClient from '@api/client';
import type {
  ApiResponse, Booking, Incident, SelectAgentPayload, IncidentReportPayload,
} from '@models/index';

export const bookingsApi = {
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Booking[]>>(`/bookings/mission/${missionId}`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`),

  selectAgent: (id: string, payload: SelectAgentPayload) =>
    apiClient.patch<ApiResponse<Booking>>(`/bookings/${id}/select-agent`, payload),

  reportIncident: (id: string, payload: IncidentReportPayload) =>
    apiClient.post<ApiResponse<Incident>>(`/bookings/${id}/incident`, payload),
};
