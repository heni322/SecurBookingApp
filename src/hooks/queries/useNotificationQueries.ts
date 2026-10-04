/**
 * useNotificationQueries — TanStack Query v5 hooks for notifications.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { notificationsApi }       from '@api/endpoints/notifications';
import { queryClient }          from '@lib/queryClient';
import { qk }                   from '@api/queryKeys';
import { STALE_TIME }             from '@constants/config';

// ─── List ──────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey:  qk.notifications.list(),
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
    queryKey:  qk.notifications.unread(),
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
      // One call, not two: unread() is ['notifications','unread'], a child of
      // all = ['notifications'], and invalidation matches by prefix.
      queryClient.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}

// ─── Mutation: mark all read ──────────────────────────────────────────────

export function useMarkAllRead() {
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      // One call, not two: unread() is ['notifications','unread'], a child of
      // all = ['notifications'], and invalidation matches by prefix.
      queryClient.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}
