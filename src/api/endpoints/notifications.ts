import apiClient from '@api/client';
import type { ApiResponse, AppNotification } from '@models/index';

export const notificationsApi = {
  getAll: () =>
    apiClient.get<ApiResponse<AppNotification[]>>('/notifications'),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch<ApiResponse<null>>('/notifications/read-all'),
};
