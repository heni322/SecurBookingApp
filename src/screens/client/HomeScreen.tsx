/**
 * HomeScreen — tableau de bord client.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { missionsApi }           from '@api/endpoints/missions';
import { notificationsApi }      from '@api/endpoints/notifications';
import { useApi }                from '@hooks/useApi';
import { useAuthStore }          from '@store/authStore';
import { useNotificationsStore } from '@store/notificationsStore';
import { MissionCard }           from '@components/domain/MissionCard';
import { LoadingState }          from '@components/ui/LoadingState';
import { EmptyState }            from '@components/ui/EmptyState';
import { colors }                from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { MissionStatus }           from '@constants/enums';
import { isActiveMission }         from '@utils/typeGuards';
import type { Mission, MissionStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<MissionStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation               = useNavigation<Nav>();
  const { user }                 = useAuthStore();
  const setUnreadCount           = useNotificationsStore((s) => s.setUnreadCount);
  const { data: missions, loading, execute } = useApi(missionsApi.getMyMissions);

  const load = useCallback(async () => {
    await execute();
    try {
      const { data: notifRes } = await notificationsApi.getUnreadCount();
      setUnreadCount(notifRes.data.count);
    } catch { /* silent */ }
  }, [execute, setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  const allMissions    = missions ?? [];
  const activeMissions = allMissions.filter(isActiveMission);
  const recentMissions = allMissions.slice(0, 3);
  const totalMissions  = allMissions.length;
  const completedCount = allMissions.filter((m) => m.status === MissionStatus.COMPLETED).length;
  const firstName      = user?.fullName?.split(' ')[0] ?? 'Client';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {firstName} 👋</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newMissionBtn}
          onPress={() => navigation.navigate('ServicePicker')}
          activeOpacity={0.8}
        >
          <Text style={styles.newMissionIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="🛡"  value={totalMissions}        label="Missions"  />
        <StatCard icon="✅" value={completedCount}        label="Terminées" />
        <StatCard icon="🔄" value={activeMissions.length} label="En cours"  accent />
      </View>

      {/* CTA Banner */}
      {activeMissions.length === 0 && (
        <TouchableOpacity
          style={styles.ctaBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ServicePicker')}
        >
          <View>
            <Text style={styles.ctaTitle}>Besoin de sécurité ?</Text>
            <Text style={styles.ctaSubtitle}>Créez votre première mission en 2 minutes</Text>
          </View>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Recent missions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missions récentes</Text>
          {totalMissions > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate('MissionList')}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && !missions ? (
          <LoadingState message="Chargement…" />
        ) : recentMissions.length === 0 ? (
          <EmptyState
            icon="🛡"
            title="Aucune mission"
            subtitle="Créez votre première mission de sécurité."
            actionLabel="Créer une mission"
            onAction={() => navigation.navigate('ServicePicker')}
          />
        ) : (
          recentMissions.map((m: Mission) => (
            <MissionCard
              key={m.id}
              mission={m}
              onPress={() => navigation.navigate('MissionDetail', { missionId: m.id })}
              compact
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: string; value: number; label: string; accent?: boolean;
}> = ({ icon, value, label, accent = false }) => (
  <View style={[statStyles.card, accent && statStyles.cardAccent]}>
    <Text style={statStyles.icon}>{icon}</Text>
    <Text style={[statStyles.value, accent && statStyles.valueAccent]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[4],
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, gap: spacing[1],
  },
  cardAccent:  { borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface },
  icon:        { fontSize: 22 },
  value:       { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.5 },
  valueAccent: { color: colors.primary },
  label:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[10] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing[8], marginBottom: spacing[6],
  },
  greeting:    { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.5 },
  date:        { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing[1], textTransform: 'capitalize' },
  newMissionBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  newMissionIcon: { fontSize: 28, color: colors.textInverse, lineHeight: 32, marginTop: -2 },
  statsRow:    { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] },
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[6],
  },
  ctaTitle:    { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textInverse, letterSpacing: -0.3 },
  ctaSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textInverse, opacity: 0.8, marginTop: spacing[1] },
  ctaArrow:    { fontSize: 28, color: colors.textInverse },
  section:     { marginTop: spacing[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  sectionTitle:  { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  sectionLink:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
});
