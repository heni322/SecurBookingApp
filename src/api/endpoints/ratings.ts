import apiClient from '@api/client';
import type { ApiResponse, Rating, CreateRatingPayload } from '@models/index';

/**
 * Réponse de GET /ratings/get/agent/:agentId
 * Le backend renvoie un agrégat (moyenne + total + liste), pas un tableau brut.
 */
export interface AgentRatingsResponse {
  averageRating: number;
  totalRatings:  number;
  ratings:       Rating[];
}

/**
 * URLs alignées sur la convention backend (ratings.controller.ts) :
 *   POST /ratings/create
 *   GET  /ratings/get/agent/:agentId
 */
export const ratingsApi = {
  /** [CLIENT/AGENT] Soumettre une évaluation après mission complétée */
  create: (payload: CreateRatingPayload) =>
    apiClient.post<ApiResponse<Rating>>('/ratings/create', payload),

  /** Évaluations reçues par un agent (moyenne + total + liste) */
  getByAgent: (agentId: string) =>
    apiClient.get<ApiResponse<AgentRatingsResponse>>(`/ratings/get/agent/${agentId}`),
};
