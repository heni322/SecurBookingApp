import apiClient from '@api/client';
import type {
  ApiResponse, Payment, PaymentIntentResponse, CreatePaymentIntentPayload,
} from '@models/index';

export const paymentsApi = {
  /**
   * [CLIENT] Créer un PaymentIntent (CARD) ou SetupIntent (SEPA).
   * Le backend détermine le type depuis payload.method.
   * Retourne clientSecret + type ('payment_intent' | 'setup_intent').
   */
  createIntent: (payload: CreatePaymentIntentPayload) =>
    apiClient.post<ApiResponse<PaymentIntentResponse>>('/payments/intent', payload),

  /** Récupérer le paiement d'une mission */
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Payment>>(`/payments/mission/${missionId}`),
};
