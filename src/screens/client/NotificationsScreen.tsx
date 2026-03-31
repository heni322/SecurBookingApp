/**
 * NotificationsScreen — liste des notifications avec marquage lu/non-lu.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
import { Bell, CheckCheck } from 'lucide-react-native';
import { notificationsApi }      from '@api/endpoints/notifications';
import { useApi }                from '@hooks/useApi';
import { useNotificationsStore } from '@store/notificationsStore';
import { NotificationItem }      from '@components/domain/NotificationItem';
import { LoadingState }          from '@components/ui/LoadingState';
import { EmptyState }            from '@components/ui/EmptyState';
import { colors }                from '@theme/colors';
import { spacing, layout }       from '@theme/spacing';
import { fontSize, fontFamily }  from '@theme/typography';
import type { AppNotification }  from '@models/index';

export const NotificationsScreen: React.FC = () => {
  const { setUnreadCount, decrement, reset } = useNotificationsStore();
  const { data: notifications, loading, execute } = useApi(notificationsApi.getAll);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setReadIds(new Set());
    await execute();
    reset();
  }, [execute, reset]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    decrement();
    try {
      await notificationsApi.markRead(id);
    } catch {
      setReadIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [decrement]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      load();
    } catch { /* silent */ }
  }, [load, setUnreadCount]);

  const mergedNotifications = (notifications ?? []).map((n) => (
    readIds.has(n.id) ? { ...n, isRead: true } : n
  ));
  const unread = mergedNotifications.filter((n) => !n.isRead).length;

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationItem
        notification={item}
        onPress={() => { if (!item.isRead && !readIds.has(item.id)) handleMarkRead(item.id); }}
      />
    ),
    [handleMarkRead, readIds],
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={26} color={colors.textPrimary} strokeWidth={1.8} />
          <View>
            <Text style={styles.title}>Notifications</Text>
            {unread > 0 && (
              <Text style={styles.unreadCount}>{unread} non lue{unread > 1 ? 's' : ''}</Text>
            )}
          </View>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
            <CheckCheck size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.readAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !notifications ? (
        <LoadingState message="Chargement…" />
      ) : (
        <FlatList
          data={mergedNotifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🔔"
              title="Aucune notification"
              subtitle="Vous serez notifié des mises à jour de vos missions ici."
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[8],
    paddingBottom:     spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing[3],
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.5,
  },
  unreadCount: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    marginTop:  spacing[1],
  },
  readAllBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing[1] + 2,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    backgroundColor: colors.primarySurface,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
  },
  readAllText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.primary,
  },
});
