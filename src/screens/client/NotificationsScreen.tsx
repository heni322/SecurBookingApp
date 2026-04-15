/**
 * NotificationsScreen — notification feed with unread management + deep navigation.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet,
} from 'react-native';
import { Bell, CheckCheck, BellOff }     from 'lucide-react-native';
import { CommonActions, useNavigation }  from '@react-navigation/native';
import type { NavigationProp }           from '@react-navigation/native';
import { notificationsApi }      from '@api/endpoints/notifications';
import { useApi }                from '@hooks/useApi';
import { useNotificationsStore } from '@store/notificationsStore';
import { NotificationItem }      from '@components/domain/NotificationItem';
import { LoadingState }          from '@components/ui/LoadingState';
import { EmptyState }            from '@components/ui/EmptyState';
import { colors }                from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }  from '@theme/typography';
import type { AppNotification, MainTabParamList } from '@models/index';
import { useTranslation }        from '@i18n';

function resolveNavAction(notif: AppNotification) {
  const meta = (notif.metadata ?? {}) as Record<string, string>;
  switch (notif.type) {
    case 'MISSION_AVAILABLE': case 'MISSION_PUBLISHED': case 'BOOKING_ASSIGNED':
      return meta.missionId
        ? CommonActions.navigate('Missions', { screen: 'MissionDetail', params: { missionId: meta.missionId } })
        : CommonActions.navigate('Missions', { screen: 'MissionList' });
    case 'BOOKING_CHECKIN': case 'BOOKING_CHECKOUT':
      if (meta.bookingId) return CommonActions.navigate('Missions', { screen: 'BookingDetail', params: { bookingId: meta.bookingId } });
      if (meta.missionId) return CommonActions.navigate('Missions', { screen: 'MissionDetail', params: { missionId: meta.missionId } });
      return CommonActions.navigate('Missions', { screen: 'MissionList' });
    case 'AGENT_LOCATION_UPDATE':
      if (meta.missionId && meta.bookingId)
        return CommonActions.navigate('Missions', { screen: 'LiveTracking', params: { missionId: meta.missionId, bookingId: meta.bookingId, agentName: meta.agentName ?? 'Agent', missionAddress: meta.missionAddress ?? '', siteLat: parseFloat(meta.siteLat ?? '0'), siteLng: parseFloat(meta.siteLng ?? '0') } });
      return null;
    case 'PAYMENT_CONFIRMED': case 'PAYMENT_FAILED':
      return CommonActions.navigate('Profile', { screen: 'PaymentHistory' });
    case 'INCIDENT_REPORTED':
      return meta.missionId
        ? CommonActions.navigate('Missions', { screen: 'Dispute', params: { missionId: meta.missionId, bookingId: meta.bookingId, missionTitle: meta.missionTitle ?? 'Mission' } })
        : null;
    case 'RATING_RECEIVED':
      return meta.missionId
        ? CommonActions.navigate('Missions', { screen: 'MissionDetail', params: { missionId: meta.missionId } })
        : null;
    case 'DOCUMENT_APPROVED': case 'DOCUMENT_REJECTED':
      return CommonActions.navigate('Profile', { screen: 'ProfileMain' });
    default: return null;
  }
}

export const NotificationsScreen: React.FC = () => {
  const { t }          = useTranslation('notifications');
  const navigation     = useNavigation<NavigationProp<MainTabParamList>>();
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
    setReadIds(prev => new Set(prev).add(id));
    decrement();
    try { await notificationsApi.markRead(id); }
    catch { setReadIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  }, [decrement]);

  const handleMarkAllRead = useCallback(async () => {
    try { await notificationsApi.markAllRead(); setUnreadCount(0); load(); }
    catch { /* silent */ }
  }, [load, setUnreadCount]);

  const handlePress = useCallback((notif: AppNotification) => {
    if (!notif.isRead && !readIds.has(notif.id)) handleMarkRead(notif.id);
    const action = resolveNavAction(notif);
    if (action) navigation.dispatch(action);
  }, [handleMarkRead, readIds, navigation]);

  const merged = (Array.isArray(notifications) ? notifications : []).map(n =>
    readIds.has(n.id) ? { ...n, isRead: true } : n,
  );
  const unread = merged.filter(n => !n.isRead).length;

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <NotificationItem notification={item} onPress={() => handlePress(item)} />
  ), [handlePress]);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bellWrap}>
            <Bell size={24} color={colors.primary} strokeWidth={1.8} />
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.title}>{t('title')}</Text>
            <Text style={styles.subtitle}>
              {unread > 0
                ? t(unread === 1 ? 'unread_one' : 'unread_other', { count: unread })
                : t('all_up_to_date')
              }
            </Text>
          </View>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn} activeOpacity={0.75}>
            <CheckCheck size={14} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.readAllText}>{t('mark_all_read')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Unread strip ── */}
      {unread > 0 && (
        <View style={styles.unreadStrip}>
          <View style={styles.unreadDot} />
          <Text style={styles.unreadStripText}>
            {t(unread === 1 ? 'strip_one' : 'strip_other', { count: unread })}
          </Text>
        </View>
      )}

      {/* ── List ── */}
      {loading && !notifications ? (
        <LoadingState message={t('loading')} />
      ) : (
        <FlatList
          data={merged}
          keyExtractor={n => n.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              Icon={BellOff}
              iconColor={colors.textMuted}
              title={t('empty_title')}
              subtitle={t('empty_subtitle')}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: colors.background },
  list:            { flexGrow: 1, paddingBottom: spacing[10] },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[10], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  bellWrap:        { width: 44, height: 44, borderRadius: radius.xl, backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge:       { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.background },
  bellBadgeText:   { fontFamily: fontFamily.bodySemiBold, fontSize: 9, color: '#fff', lineHeight: 12 },
  title:           { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle:        { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  readAllBtn:      { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2, paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: colors.primarySurface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderPrimary },
  readAllText:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  unreadStrip:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.primarySurface, paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  unreadDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, flexShrink: 0 },
  unreadStripText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary },
});
