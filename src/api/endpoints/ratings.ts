import apiClient from '@api/client';
import type { ApiResponse, Rating, CreateRatingPayload } from '@models/index';

export const ratingsApi = {
  create: (payload: CreateRatingPayload) =>
    apiClient.post<ApiResponse<Rating>>('/ratings', payload),

  getByAgent: (agentId: string) =>
    apiClient.get<ApiResponse<Rating[]>>(`/ratings/agent/${agentId}`),
};
