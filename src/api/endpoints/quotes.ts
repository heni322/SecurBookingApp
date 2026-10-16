import apiClient from '@api/client';
import type { ApiResponse, Quote, CreateQuotePayload } from '@models/index';

export const quotesApi = {
  /** [CLIENT] Calculer / recalculer un devis */
  // The API derives the lines from the mission's bookings and its DTO accepts
  // ONLY missionId (forbidNonWhitelisted): any extra field — the partner
  // funding screen sent bookingLines — was a 400. Send exactly what it takes.
  calculate: (payload: CreateQuotePayload) =>
    apiClient.post<ApiResponse<Quote>>('/quotes/calculate', { missionId: payload.missionId }),

  /** Récupérer le devis d'une mission */
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Quote>>(`/quotes/get/mission/${missionId}`),

  /** [CLIENT] Accepter un devis */
  accept: (id: string) =>
    apiClient.patch<ApiResponse<Quote>>(`/quotes/accept/${id}`),
};
