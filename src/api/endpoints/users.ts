import apiClient from '@api/client';
import type { ApiResponse, User, UpdateUserPayload } from '@models/index';

export const usersApi = {
  getMe: () =>
    apiClient.get<ApiResponse<User>>('/users/me'),

  updateMe: (payload: UpdateUserPayload) =>
    apiClient.patch<ApiResponse<User>>('/users/me', payload),

  /**
   * [RGPD] Supprimer définitivement le compte.
   *
   * CRITICAL FIX: the backend DeleteMeDto now validates BOTH fields
   * server-side (password + confirmPhrase).  Previously only `password`
   * was sent — `confirmPhrase` was collected by the UI but silently
   * dropped here, making the confirmation phrase a UX-only check with
   * zero server enforcement.
   *
   * @param password     Current account password.
   * @param confirmPhrase Must be exactly "SUPPRIMER MON COMPTE" (the
   *                     backend @Equals() validator rejects anything else
   *                     with a 400, so even a direct API call is blocked).
   */
  deleteMe: (password: string, confirmPhrase: string) =>
    apiClient.delete<ApiResponse<null>>('/users/me', {
      data: { password, confirmPhrase },
    }),
};
