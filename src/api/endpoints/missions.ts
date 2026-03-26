import apiClient from '@api/client';
import type {
  ApiResponse, Mission, CreateMissionPayload, UpdateMissionPayload,
} from '@models/index';

export const missionsApi = {
  getMyMissions: () =>
    apiClient.get<ApiResponse<Mission[]>>('/missions/my'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Mission>>(`/missions/${id}`),

  create: (payload: CreateMissionPayload) =>
    apiClient.post<ApiResponse<Mission>>('/missions', payload),

  update: (id: string, payload: UpdateMissionPayload) =>
    apiClient.patch<ApiResponse<Mission>>(`/missions/${id}`, payload),

  cancel: (id: string) =>
    apiClient.patch<ApiResponse<Mission>>(`/missions/${id}/cancel`),
};
