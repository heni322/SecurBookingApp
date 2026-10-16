/**
 * PartnerMissionsScreen — Missions publiees par le partenaire (donneur d ordre).
 * GET /missions/posted. Permet de consulter et d annuler ses missions, et de
 * lancer la creation d une nouvelle mission.
 *
 * [FIX 2026-10-07] Unfunded missions (CREATED) now carry "Valider le devis et
 * payer", the only way back into the funding flow if the partner left it —
 * before, an unpaid order was a dead end (never published to agents).
 * CANCELLABLE listed DRAFT / CONFIRMED, which are not mission statuses.
 * Each card now says how many posts are filled and by whom (the partner had
 * only a raw post count), and an unpaid order whose transfer is declared
 * says so instead of inviting a second declaration.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus, MapPin, CalendarClock, Users, Zap, Briefcase, XCircle, Receipt,
} from 'lucide-react-native';

import { missionsApi, type MissionScope } from '@api/endpoints/missions';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Badge }        from '@components/ui/Badge';
import { Button }       from '@components/ui/Button';
import { EmptyState }   from '@components/ui/EmptyState';
import { showAlert }    from '@components/ui/AlertModal';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime }  from '@utils/formatters';
import type { Mission, PartnerStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<PartnerStackParamList>;
type BadgeVariant = 'info' | 'success' | 'danger' | 'warning' | 'primary' | 'accent';

/**
 * statusBadge — maps the legacy variant names used by ported partner code
 * ('success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent') to the
 * client's Badge {color, bg} pair. Kept inline because it is consumed by
 * a single screen; promote to shared utils if reused.
 */
export function statusBadge(status: string): { color: string; bg: string } {
  const v = statusVariant(status);
  switch (v) {
    case 'success': return { color: colors.success, bg: colors.successSurface };
    case 'warning': return { color: colors.warning, bg: colors.warningSurface };
    case 'danger':  return { color: colors.danger,  bg: colors.dangerSurface };
    case 'info':    return { color: colors.info,    bg: colors.infoSurface };
    case 'accent':  return { color: colors.accent,  bg: colors.accentSurface };
    default:        return { color: colors.primary, bg: colors.primarySurface };
  }
}
// Mirrors the API rule for partners (MissionsService.cancel).
const CANCELLABLE = new Set(['CREATED', 'PUBLISHED', 'STAFFING']);
const FILLED = new Set(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']);

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'COMPLETED':  return 'success';
    case 'CANCELLED':  return 'danger';
    case 'IN_PROGRESS': return 'primary';
    case 'PUBLISHED':
    case 'STAFFING':
    case 'STAFFED':    return 'warning';
    default:           return 'info';
  }
}

export const PartnerMissionsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();

  const [scope,      setScope]      = useState<MissionScope>('ACTIVE');
  const [missions,   setMissions]   = useState<Mission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (s: MissionScope, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const { data: res } = await missionsApi.getPosted(s);
      const items = ((res as any)?.data ?? res ?? []) as Mission[];
      setMissions(items);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('missionsList.error.body'));
      setMissions([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(scope); }, [load, scope]));

  const switchScope = (s: MissionScope) => { setScope(s); load(s); };

  const confirmCancel = (m: Mission) => {
    showAlert(
      t('missionsList.cancel.title'),
      t('missionsList.cancel.body'),
      [
        { text: t('missionsList.cancel.dismiss'), style: 'cancel' },
        {
          text: t('missionsList.cancel.confirm'),
          style: 'destructive',
          onPress: async () => {
            setCancelling(m.id);
            try {
              await missionsApi.cancel(m.id);
              await load(scope, true);
            } catch (err: any) {
              showAlert(t('missionsList.cancel.errorTitle'), err?.response?.data?.message ?? t('missionsList.cancel.errorBody'));
            } finally {
              setCancelling(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('missionsList.title')}
        onBack={() => navigation.goBack()}
        showBack
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('PartnerCreateMission')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Plus size={18} color={palette.navy} strokeWidth={2.6} />
          </TouchableOpacity>
        }
      />

      {/* Scope toggle */}
      <View style={styles.tabs}>
        {(['ACTIVE', 'ARCHIVED'] as MissionScope[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.tab, scope === s && styles.tabActive]} onPress={() => switchScope(s)} activeOpacity={0.8}>
            <Text style={[styles.tabTxt, scope === s && styles.tabTxtActive]}>
              {s === 'ACTIVE' ? t('missionsList.tabs.active') : t('missionsList.tabs.archived')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && missions.length === 0 ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : error && missions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={XCircle}
            title={t('missionsList.error.title')}
            subtitle={error}
            actionLabel={t('missionsList.error.retry')}
            onAction={() => load(scope)}
          />
        </View>
      ) : missions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={Briefcase}
            title={t('missionsList.empty.title')}
            subtitle={scope === 'ACTIVE' ? t('missionsList.empty.activeBody') : t('missionsList.empty.archivedBody')}
            actionLabel={scope === 'ACTIVE' ? t('missionsList.empty.action') : undefined}
            onAction={scope === 'ACTIVE' ? () => navigation.navigate('PartnerCreateMission') : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={missions}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(scope, true)} tintColor={colors.primary} />}
          ListFooterComponent={
            <>
              <View style={{ height: spacing[6] }} />
              <Button label={t('missionsList.newMission')} onPress={() => navigation.navigate('PartnerCreateMission')} fullWidth variant="outline" />
              <View style={{ height: spacing[10] }} />
            </>
          }
          renderItem={({ item: m }) => {
            const posts      = (m.bookings ?? []).filter((b: any) => b.status !== 'CANCELLED');
            const filled     = posts.filter((b: any) => FILLED.has(b.status));
            const names      = filled.map((b: any) => b.agent?.fullName).filter(Boolean) as string[];
            const canCancel  = CANCELLABLE.has(m.status);
            const transferPending = (m as any).payment?.status === 'PENDING';
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PartnerMissionDetail', { missionId: m.id })}
                accessibilityRole="button"
                accessibilityLabel={m.title || m.city || t('missionsList.untitled')}
              >
              <Card style={styles.missionCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.missionTitle} numberOfLines={1}>
                    {m.title || m.city || t('missionsList.untitled')}
                  </Text>
                  <Badge label={t(`missionsList.status.${m.status}`, { defaultValue: String(m.status) })} {...statusBadge(m.status)} />
                </View>

                {m.isUrgent && (
                  <View style={styles.urgentTag}>
                    <Zap size={12} color={palette.gold} strokeWidth={2.4} />
                    <Text style={styles.urgentTxt}>{t('missionsList.urgent')}</Text>
                  </View>
                )}

                <View style={styles.metaRow}>
                  <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.metaTxt} numberOfLines={1}>
                    {[m.address, m.city].filter(Boolean).join(', ') || '—'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <CalendarClock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.metaTxt}>
                    {m.startAt ? `${formatDate(m.startAt)} · ${formatTime(m.startAt)}` : '—'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Users size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.metaTxt} numberOfLines={2}>
                    {t('missionsList.filled', { filled: filled.length, total: posts.length })}
                    {names.length > 0
                      ? ` · ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` ${t('missionsList.moreAgents', { count: names.length - 3 })}` : ''}`
                      : ''}
                  </Text>
                </View>

                {m.status === 'CREATED' && (
                  <TouchableOpacity
                    style={styles.fundBtn}
                    onPress={() => navigation.navigate('PartnerMissionFunding', { missionId: m.id, bookingLines: [] })}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <Receipt size={15} color={palette.navy} strokeWidth={2.2} />
                    <Text style={styles.fundTxt}>{transferPending ? t('missionsList.transferPending') : t('missionsList.fundAction')}</Text>
                  </TouchableOpacity>
                )}

                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => confirmCancel(m)}
                    disabled={cancelling === m.id}
                    activeOpacity={0.75}
                  >
                    {cancelling === m.id
                      ? <ActivityIndicator size="small" color={colors.danger} />
                      : <><XCircle size={15} color={colors.danger} strokeWidth={2} /><Text style={styles.cancelTxt}>{t('missionsList.cancelAction')}</Text></>}
                  </TouchableOpacity>
                )}
              </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:   { flex: 1, justifyContent: 'center', paddingHorizontal: layout.screenPaddingH },
  content:     { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[3] },

  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },

  tabs:      { flexDirection: 'row', gap: spacing[2], paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[3] },
  tab:       { flex: 1, height: 40, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.primarySurface, borderColor: colors.borderPrimary },
  tabTxt:       { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  tabTxtActive: { color: colors.primary },

  missionCard: { marginBottom: spacing[3], gap: spacing[2] },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  missionTitle:{ flex: 1, fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },

  urgentTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: palette.amberDim, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.sm },
  urgentTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.gold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  metaTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },

  fundBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginTop: spacing[2], minHeight: 44, borderRadius: radius.md, backgroundColor: palette.gold },
  fundTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: palette.navy },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginTop: spacing[2], height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.dangerSurface },
  cancelTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.danger },
});
