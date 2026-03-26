import apiClient from '@api/client';
import type {
  ApiResponse,
  User,
  UpdateUserPayload,
} from '@types/index';

export const usersApi = {
  // GET /users/me
  getMe: () =>
    apiClient.get<ApiResponse<User>>('/users/me'),

  // PATCH /users/me
  updateMe: (payload: UpdateUserPayload) =>
    apiClient.patch<ApiResponse<User>>('/users/me', payload),

  // PATCH /users/:id/status  [ADMIN]
  updateStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}/status`, { status }),
};
