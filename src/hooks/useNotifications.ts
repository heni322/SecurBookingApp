/**
 * useNotifications.ts — hook domain notifications.
 */
import { useEffect, useCallback } from 'react';
import { notificationsApi }      from '@api/endpoints/notifications';
import { useApi }                from '@hooks/useApi';
import { useNotificationsStore } from '@store/notificationsStore';

export function useNotifications() {
  const { setUnreadCount, reset } = useNotificationsStore();
  const { data, loading, execute }= useApi(notificationsApi.getAll);

  const refresh = useCallback(async () => {
    await execute();
    reset();
  }, [execute, reset]);

  useEffect(() => { refresh(); }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    await notificationsApi.markRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    refresh();
  }, [refresh, setUnreadCount]);

  const notifications = data ?? [];
  const unread        = notifications.filter((n) => !n.isRead).length;

  return { notifications, unread, loading, refresh, markRead, markAllRead };
}
