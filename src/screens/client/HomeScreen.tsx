/**
 * HomeScreen — Premium client dashboard.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Shield, CheckCircle, RefreshCw, Plus, ChevronRight,
  Zap, ArrowUpRight, AlertOctagon, X,
} from 'lucide-react-native';
import { missionsApi }           from '@api/endpoints/missions';
import { notificationsApi }      from '@api/endpoints/notifications';
import { sosApi }                from '@api/endpoints/sos';
import { useApi }                from '@hooks/useApi';
import { useAuthStore }          from '@store/authStore';
import { useNotificationsStore } from '@store/notificationsStore';
import { MissionCard }           from '@components/domain/MissionCard';
import { EmptyState }            from '@components/ui/EmptyState';
import { StatCardSkeleton, MissionListSkeleton } from '@components/ui/SkeletonLoader';
import { colors }                from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }  from '@theme/typography';
import { MissionStatus }         from '@constants/enums';
import { isActiveMission }       from '@utils/typeGuards';
import type { Mission, MainTabParamList, MissionStackParamList } from '@models/index';
import { useTranslation }        from '@i18n';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<MissionStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const { t }          = useTranslation('home');
  const navigation     = useNavigation<Nav>();
  const { user }       = useAuthStore();
  const setUnreadCount = useNotificationsStore(s => s.setUnreadCount);
  const { data: missions, loading, execute } = useApi(missionsApi.getMyMissions);
  const [sosVisible, setSosVisible] = useState(false);
  const [sosSending, setSosSending] = useState(false);

  const load = useCallback(async () => {
    await execute();
    try {
      const { data: notifRes } = await notificationsApi.getUnreadCount();
      setUnreadCount((notifRes as any).data.count ?? 0);
    } catch { /* silent */ }
  }, [execute, setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  const allMissions     = missions ?? [];
  const activeMissions  = allMissions.filter(isActiveMission);
  const recentMissions  = allMissions.slice(0, 4);
  const totalMissions   = allMissions.length;
  const completedCount  = allMissions.filter(m => m.status === MissionStatus.COMPLETED).length;
  const inProgressCount = allMissions.filter(m =>
    m.status === MissionStatus.PUBLISHED  ||
    m.status === MissionStatus.STAFFING   ||
    m.status === MissionStatus.STAFFED    ||
    m.status === MissionStatus.IN_PROGRESS,
  ).length;

  const firstName = user?.fullName?.split(' ')[0] ?? 'Client';
  const hour      = new Date().getHours();
  const greeting  = hour < 18 ? t('greeting.morning') : t('greeting.evening');

  const goToServicePicker = () => navigation.navigate('Missions', { screen: 'ServicePicker' } as any);
  const goToMissionDetail = (id: string) => navigation.navigate('Missions', { screen: 'MissionDetail', params: { missionId: id } } as any);
  const goToMissionList   = () => navigation.navigate('Missions', { screen: 'MissionList' } as any);

  const handleSos = useCallback(async () => {
    setSosSending(true);
    try {
      await sosApi.trigger({ message: t('sos.trigger_message') });
      setSosVisible(false);
      Alert.alert(t('sos.success_title'), t('sos.success_body'));
    } catch {
      Alert.alert(t('sos.title'), t('sos.error_body'));
    } finally {
      setSosSending(false);
    }
  }, [t]);

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}, {firstName}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.newMissionBtn} onPress={goToServicePicker} activeOpacity={0.8}>
            <Plus size={22} color={colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        {loading && !missions ? (
          <View style={styles.statsRow}>
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <StatCard Icon={Shield}      value={totalMissions}   label={t('stats.total')}       iconColor={colors.textSecondary} iconBg={colors.surface} />
            <StatCard Icon={CheckCircle} value={completedCount}  label={t('stats.completed')}   iconColor={colors.success}       iconBg={colors.successSurface} />
            <StatCard Icon={RefreshCw}   value={inProgressCount} label={t('stats.in_progress')} iconColor={colors.primary}       iconBg={colors.primarySurface} accent />
          </View>
        )}

        {/* ── CTA Banner ── */}
        {activeMissions.length === 0 && !loading && (
          <TouchableOpacity style={styles.ctaBanner} activeOpacity={0.85} onPress={goToServicePicker}>
            <View style={styles.ctaDots} pointerEvents="none">
              {[0,1,2,3,4,5].map(i => <View key={i} style={[styles.ctaDot, { opacity: 0.08 + i * 0.04 }]} />)}
            </View>
            <View style={styles.ctaContent}>
              <View style={styles.ctaIconWrap}>
                <Zap size={20} color={colors.textInverse} strokeWidth={2} />
              </View>
              <View style={styles.ctaText}>
                <Text style={styles.ctaTitle}>{t('cta.title')}</Text>
                <Text style={styles.ctaSubtitle}>{t('cta.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.ctaArrow}>
              <ArrowUpRight size={20} color={colors.textInverse} strokeWidth={2.2} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Active mission card ── */}
        {activeMissions.length > 0 && (
          <TouchableOpacity
            style={styles.activeMissionCard}
            activeOpacity={0.85}
            onPress={() => goToMissionDetail(activeMissions[0].id)}
          >
            <View style={styles.activeLiveDot} />
            <View style={styles.activeMissionContent}>
              <Text style={styles.activeMissionLabel}>{t('active_mission.label')}</Text>
              <Text style={styles.activeMissionTitle} numberOfLines={1}>
                {activeMissions[0].title ?? activeMissions[0].city}
              </Text>
              <Text style={styles.activeMissionSub}>{activeMissions[0].city}</Text>
            </View>
            <ChevronRight size={18} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}

        {/* ── Recent missions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>{t('recent.title')}</Text>
            </View>
            {totalMissions > 4 && (
              <TouchableOpacity onPress={goToMissionList} style={styles.seeAllBtn}>
                <Text style={styles.sectionLink}>{t('recent.see_all')}</Text>
                <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {loading && !missions ? (
            <MissionListSkeleton count={3} />
          ) : recentMissions.length === 0 ? (
            <EmptyState
              Icon={Shield}
              title={t('empty.title')}
              subtitle={t('empty.subtitle')}
              actionLabel={t('empty.action')}
              onAction={goToServicePicker}
            />
          ) : (
            recentMissions.map((m: Mission) => (
              <MissionCard key={m.id} mission={m} onPress={() => goToMissionDetail(m.id)} compact />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── SOS floating button ── */}
      <TouchableOpacity style={styles.sosBtn} onPress={() => setSosVisible(true)} activeOpacity={0.85}>
        <AlertOctagon size={22} color={colors.white} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* ── SOS Modal ── */}
      <Modal visible={sosVisible} transparent animationType="fade" onRequestClose={() => setSosVisible(false)}>
        <View style={sosStyles.overlay}>
          <View style={sosStyles.sheet}>
            <TouchableOpacity style={sosStyles.closeBtn} onPress={() => setSosVisible(false)}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
            <View style={sosStyles.iconWrap}>
              <AlertOctagon size={36} color={colors.danger} strokeWidth={1.8} />
            </View>
            <Text style={sosStyles.title}>{t('sos.title')}</Text>
            <Text style={sosStyles.body}>{t('sos.body')}</Text>
            <TouchableOpacity style={sosStyles.sendBtn} onPress={handleSos} disabled={sosSending} activeOpacity={0.85}>
              {sosSending
                ? <ActivityIndicator color={colors.white} size="small" />
                : (<><AlertOctagon size={16} color={colors.white} strokeWidth={2} /><Text style={sosStyles.sendBtnText}>{t('sos.send')}</Text></>)
              }
            </TouchableOpacity>
            <TouchableOpacity style={sosStyles.cancelBtn} onPress={() => setSosVisible(false)}>
              <Text style={sosStyles.cancelText}>{t('sos.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const StatCard: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  value: number; label: string; iconColor: string; iconBg: string; accent?: boolean;
}> = ({ Icon, value, label, iconColor, iconBg, accent = false }) => (
  <View style={[statStyles.card, accent && statStyles.cardAccent]}>
    <View style={[statStyles.iconWrap, { backgroundColor: iconBg }]}>
      <Icon size={16} color={iconColor} strokeWidth={1.8} />
    </View>
    <Text style={[statStyles.value, accent && statStyles.valueAccent]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  card:        { flex: 1, alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[2], backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, gap: spacing[2] },
  cardAccent:  { borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface },
  iconWrap:    { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  value:       { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.5 },
  valueAccent: { color: colors.primary },
  label:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  screenWrapper:        { flex: 1 },
  screen:               { flex: 1, backgroundColor: colors.background },
  content:              { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[10] },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[10], marginBottom: spacing[6] },
  headerLeft:           { flex: 1 },
  greeting:             { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6 },
  date:                 { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing[1], textTransform: 'capitalize', letterSpacing: 0.2 },
  newMissionBtn:        { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#bc933b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  statsRow:             { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] },
  ctaBanner:            { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius['2xl'], padding: spacing[5], marginBottom: spacing[5], overflow: 'hidden', shadowColor: '#bc933b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  ctaDots:              { position: 'absolute', right: 24, flexDirection: 'row', gap: spacing[2] },
  ctaDot:               { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  ctaContent:           { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  ctaIconWrap:          { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ctaText:              { gap: 2 },
  ctaTitle:             { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textInverse, letterSpacing: -0.3 },
  ctaSubtitle:          { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textInverse, opacity: 0.75 },
  ctaArrow:             { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  activeMissionCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.primary + '55', padding: spacing[4], marginBottom: spacing[5], gap: spacing[3] },
  activeLiveDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, shadowColor: colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
  activeMissionContent: { flex: 1, gap: 2 },
  activeMissionLabel:   { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.primary, letterSpacing: 0.8 },
  activeMissionTitle:   { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  activeMissionSub:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  section:              { marginTop: spacing[2] },
  sectionHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  sectionTitleRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionAccent:        { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle:         { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  seeAllBtn:            { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLink:          { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  sosBtn:               { position: 'absolute', bottom: spacing[6], right: layout.screenPaddingH, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
});

const sosStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'flex-end' },
  sheet:       { width: '100%', backgroundColor: colors.backgroundElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: layout.screenPaddingH, paddingBottom: spacing[10], alignItems: 'center', gap: spacing[4] },
  closeBtn:    { alignSelf: 'flex-end', padding: spacing[2], marginBottom: -spacing[2] },
  iconWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.dangerSurface, borderWidth: 1, borderColor: colors.danger + '55', alignItems: 'center', justifyContent: 'center' },
  title:       { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, textAlign: 'center' },
  body:        { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  sendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], width: '100%', paddingVertical: spacing[4], backgroundColor: colors.danger, borderRadius: radius.full, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  sendBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.white },
  cancelBtn:   { paddingVertical: spacing[3] },
  cancelText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textMuted },
});