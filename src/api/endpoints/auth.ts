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

  setup2FA: () =>
    apiClient.post<ApiResponse<TwoFaSetupResponse>>('/auth/2fa/setup'),

  enable2FA: (code: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/enable', { code }),

  disable2FA: (code: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/disable', { code }),
};
