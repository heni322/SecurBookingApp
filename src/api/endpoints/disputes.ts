import apiClient from '@api/client';
import type { ApiResponse, Dispute, CreateDisputePayload } from '@models/index';

export const disputesApi = {
  create: (payload: CreateDisputePayload) =>
    apiClient.post<ApiResponse<Dispute>>('/disputes', payload),

  getMine: () =>
    apiClient.get<ApiResponse<Dispute[]>>('/disputes/mine'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Dispute>>(`/disputes/${id}`),
};
