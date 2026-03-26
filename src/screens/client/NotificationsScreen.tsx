/**
 * NotificationsScreen — liste des notifications avec marquage lu/non-lu.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
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
  const { setUnreadCount, reset } = useNotificationsStore();
  const { data: notifications, loading, execute } = useApi(notificationsApi.getAll);

  const load = useCallback(async () => {
    await execute();
    reset();   // marquer comme tout lu localement au chargement
  }, [execute, reset]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    try { await notificationsApi.markRead(id); } catch { /* silent */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      load();
    } catch { /* silent */ }
  }, [load, setUnreadCount]);

  const unread = (notifications ?? []).filter((n) => !n.isRead).length;

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationItem
        notification={item}
        onPress={() => { if (!item.isRead) handleMarkRead(item.id); }}
      />
    ),
    [handleMarkRead],
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && (
            <Text style={styles.unreadCount}>{unread} non lue{unread > 1 ? 's' : ''}</Text>
          )}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !notifications ? (
        <LoadingState message="Chargement…" />
      ) : (
        <FlatList
          data={notifications ?? []}
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
    flexDirection:   'row',
    alignItems:      'flex-end',
    justifyContent:  'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:      spacing[8],
    paddingBottom:   spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
  },
  readAllText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.primary,
  },
});
