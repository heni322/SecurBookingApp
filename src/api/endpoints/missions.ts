import apiClient from '@api/client';
import type {
  ApiResponse, Mission, CreateMissionPayload, UpdateMissionPayload,
} from '@models/index';

export const missionsApi = {
  /** [CLIENT] Mes missions */
  getMyMissions: () =>
    apiClient.get<ApiResponse<Mission[]>>('/missions/my'),

  /** Détail d'une mission */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Mission>>(`/missions/${id}`),

  /** [CLIENT] Créer une mission (DRAFT) */
  create: (payload: CreateMissionPayload) =>
    apiClient.post<ApiResponse<Mission>>('/missions', payload),

  /** [CLIENT] Modifier une mission (DRAFT uniquement) */
  update: (id: string, payload: UpdateMissionPayload) =>
    apiClient.patch<ApiResponse<Mission>>(`/missions/${id}`, payload),

  /** Annuler une mission */
  cancel: (id: string) =>
    apiClient.patch<ApiResponse<Mission>>(`/missions/${id}/cancel`),
};
