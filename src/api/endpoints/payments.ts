import apiClient from '@api/client';
import type {
  ApiResponse, Payment, PaymentIntentResponse, CreatePaymentIntentPayload,
} from '@models/index';
import type { PaymentStatus } from '@constants/enums';

export const paymentsApi = {
  createIntent: (payload: CreatePaymentIntentPayload) =>
    apiClient.post<ApiResponse<PaymentIntentResponse>>('/payments/intent', payload),

  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Payment>>(`/payments/mission/${missionId}`),

  findAll: (status?: PaymentStatus) =>
    apiClient.get<ApiResponse<Payment[]>>('/payments', {
      params: status ? { status } : undefined,
    }),

  refund: (missionId: string, reason: string) =>
    apiClient.post<ApiResponse<Payment>>(`/payments/mission/${missionId}/refund`, { reason }),
};
