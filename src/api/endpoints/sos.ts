import apiClient from '@api/client';
import type { ApiResponse, SosPayload } from '@models/index';

export const sosApi = {
  /** [CLIENT/AGENT] Déclencher une alerte SOS */
  trigger: (payload: SosPayload) =>
    apiClient.post<ApiResponse<{ id: string; triggeredAt: string }>>('/sos', payload),
};
