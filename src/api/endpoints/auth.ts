import apiClient from '@api/client';
import type {
  ApiResponse,
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  TwoFaSetupResponse,
  User,
} from '@models/index';

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', payload),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>(
      '/auth/refresh',
      { refreshToken },
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),

  logout: (refreshToken: string) =>
    apiClient.post<ApiResponse<null>>(
      '/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),

  /**
   * Request a password-reset email. The backend always responds 200 — even for
   * unknown addresses — to prevent account enumeration. The reset link
   * (valid 1 hour, single-use) is delivered by email and deep-links back into
   * the app at `securbook://auth/reset-password?token=…`.
   */
  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  /**
   * Consume a reset token and set a new password. Token is single-use and
   * expires after 1 hour; on success the backend revokes all active sessions
   * so a leaked token cannot keep an attacker logged in.
   */
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, newPassword }),

  setup2FA: () =>
    apiClient.post<ApiResponse<TwoFaSetupResponse>>('/auth/2fa/setup'),

  enable2FA: (code: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/enable', { code }),

  disable2FA: (code: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/disable', { code }),
};
