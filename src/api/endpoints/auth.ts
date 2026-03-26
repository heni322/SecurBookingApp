import apiClient from '@api/client';
import type {
  ApiResponse,
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  TwoFaSetupResponse,
  User,
} from '@types/index';

export const authApi = {
  // POST /auth/register
  register: (payload: RegisterPayload) =>
    apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/register', payload,
    ),

  // POST /auth/login
  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/login', payload,
    ),

  // POST /auth/refresh  (Bearer = refreshToken)
  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>(
      '/auth/refresh',
      { refreshToken },
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),

  // POST /auth/logout  (Bearer = refreshToken)
  logout: (refreshToken: string) =>
    apiClient.post<ApiResponse<null>>(
      '/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),

  // POST /auth/2fa/setup
  setup2FA: () =>
    apiClient.post<ApiResponse<TwoFaSetupResponse>>('/auth/2fa/setup'),

  // POST /auth/2fa/enable
  enable2FA: (code: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/enable', { code }),

  // POST /auth/2fa/disable
  disable2FA: (code: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/disable', { code }),
};
