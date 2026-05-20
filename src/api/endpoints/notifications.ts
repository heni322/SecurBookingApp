import apiClient from '@api/client';
import type { ApiResponse, AppNotification } from '@models/index';

export const notificationsApi = {
  getAll: () =>
    apiClient.get<ApiResponse<AppNotification[]>>('/notifications/list'),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<ApiResponse<AppNotification>>(`/notifications/mark-read/${id}`),

  markAllRead: () =>
    apiClient.patch<ApiResponse<null>>('/notifications/mark-all-read'),
};
