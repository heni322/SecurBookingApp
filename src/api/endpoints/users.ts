import apiClient from '@api/client';
import type { ApiResponse, User, UpdateUserPayload } from '@models/index';

export const usersApi = {
  getMe: () =>
    apiClient.get<ApiResponse<User>>('/users/me'),

  updateMe: (payload: UpdateUserPayload) =>
    apiClient.patch<ApiResponse<User>>('/users/me', payload),

  /** [RGPD] Supprimer définitivement le compte */
  deleteMe: (password: string) =>
    apiClient.delete<ApiResponse<null>>('/users/me', { data: { password } }),

};
