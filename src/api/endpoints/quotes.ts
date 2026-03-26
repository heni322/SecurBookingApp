import apiClient from '@api/client';
import type { ApiResponse, Quote, CreateQuotePayload } from '@models/index';

export const quotesApi = {
  calculate: (payload: CreateQuotePayload) =>
    apiClient.post<ApiResponse<Quote>>('/quotes/calculate', payload),

  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Quote>>(`/quotes/mission/${missionId}`),

  accept: (id: string) =>
    apiClient.patch<ApiResponse<Quote>>(`/quotes/${id}/accept`),
};
