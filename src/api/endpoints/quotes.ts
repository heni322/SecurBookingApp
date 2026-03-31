import apiClient from '@api/client';
import type { ApiResponse, Quote, CreateQuotePayload } from '@models/index';

export const quotesApi = {
  /** [CLIENT] Calculer / recalculer un devis */
  calculate: (payload: CreateQuotePayload) =>
    apiClient.post<ApiResponse<Quote>>('/quotes/calculate', payload),

  /** Récupérer le devis d'une mission */
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Quote>>(`/quotes/mission/${missionId}`),

  /** [CLIENT] Accepter un devis */
  accept: (id: string) =>
    apiClient.patch<ApiResponse<Quote>>(`/quotes/${id}/accept`),
};
