import apiClient from '@api/client';
import type { ApiResponse, Dispute, CreateDisputePayload } from '@models/index';

/**
 * URLs alignées sur la convention backend (disputes.controller.ts) :
 *   POST /disputes/create
 *   GET  /disputes/my
 *   GET  /disputes/get/:id
 */
export const disputesApi = {
  /** [CLIENT] Ouvrir un litige sur une mission */
  create: (payload: CreateDisputePayload) =>
    apiClient.post<ApiResponse<Dispute>>('/disputes/create', payload),

  /** [CLIENT] Mes litiges */
  getMine: () =>
    apiClient.get<ApiResponse<Dispute[]>>('/disputes/my'),

  /** Détail d'un litige */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Dispute>>(`/disputes/get/${id}`),
};
