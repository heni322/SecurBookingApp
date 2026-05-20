/**
 * useNotificationQueries — TanStack Query v5 hooks for notifications.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { notificationsApi }       from '@api/endpoints/notifications';
import { queryClient, queryKeys } from '@lib/queryClient';
import { STALE_TIME }             from '@constants/config';

// ─── List ──────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey:  queryKeys.notifications(),
    queryFn:   async () => {
      const res = await notificationsApi.getAll();
      return res.data.data ?? [];
    },
    staleTime: STALE_TIME.SHORT,
    select:    (data) => data ?? [],
  });
}

// ─── Unread count ──────────────────────────────────────────────────────────

export function useUnreadCount() {
  return useQuery({
    queryKey:  queryKeys.unreadCount(),
    queryFn:   async () => {
      const res = await notificationsApi.getUnreadCount();
      return res.data.data?.count ?? 0;
    },
    staleTime: STALE_TIME.SHORT,
    refetchInterval: 60_000, // poll every 60s
  });
}

// ─── Mutation: mark single read ───────────────────────────────────────────

export function useMarkRead() {
  return useMutation({
    mutationFn: (id: string) =>
      notificationsApi.markRead(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}

// ─── Mutation: mark all read ──────────────────────────────────────────────

export function useMarkAllRead() {
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}
