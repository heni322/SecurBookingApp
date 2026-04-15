import apiClient from '@api/client';
import type {
  ApiResponse, Payment, PaymentMethod, PaymentIntentResponse, CreatePaymentIntentPayload,
} from '@models/index';

export const paymentsApi = {

  /** [CLIENT] Lister les méthodes de paiement enregistrées */
  getMyMethods: () =>
    apiClient.get<ApiResponse<PaymentMethod[]>>('/payments/methods'),

  /** [CLIENT] Supprimer une méthode de paiement */
  detachMethod: (paymentMethodId: string) =>
    apiClient.delete<ApiResponse<null>>(`/payments/methods/${paymentMethodId}`),

  /**
   * [CLIENT] Créer un PaymentIntent (CARD) ou SetupIntent (SEPA).
   */
  createIntent: (payload: CreatePaymentIntentPayload) =>
    apiClient.post<ApiResponse<PaymentIntentResponse>>('/payments/intent', payload),

  /** Récupérer le paiement d'une mission */
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Payment>>(`/payments/mission/${missionId}`),

  /** [CLIENT] Historique de tous les paiements du client connecté */
  getMyPayments: () =>
    apiClient.get<ApiResponse<Payment[]>>('/payments/my'),

  /** [CLIENT] Créer un SetupIntent pour sauvegarder une méthode (sans mission) */
  setupMethodIntent: (type: 'card' | 'sepa_debit') =>
    apiClient.post<ApiResponse<{ clientSecret: string; setupIntentId: string; type: string }>>('/payments/methods/setup', { type }),

  /** [CLIENT] Télécharger la facture PDF d'un paiement (retourne URL signée) */
  getInvoiceUrl: (paymentId: string) =>
    apiClient.get<ApiResponse<{ url: string }>>(`/payments/${paymentId}/invoice`),
};
