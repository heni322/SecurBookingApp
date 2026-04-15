/**
 * SelectAgentScreen — Agent selection from booking applications.
 */
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Star, UserCheck, Users, Award, Briefcase } from 'lucide-react-native';
import { bookingsApi }  from '@api/endpoints/bookings';
import { useApi }       from '@hooks/useApi';
import { Avatar }       from '@components/ui/Avatar';
import { Badge }        from '@components/ui/Badge';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState }   from '@components/ui/EmptyState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { Application, MissionStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'SelectAgent'>;

export const SelectAgentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }         = useTranslation('missions');
  const { bookingId } = route.params;
  const { data: booking, loading, execute } = useApi(bookingsApi.getById);
  const [selecting, setSelecting] = useState<string | null>(null);

  const load = useCallback(() => execute(bookingId), [execute, bookingId]);
  useEffect(() => { load(); }, [load]);

  const handleSelect = async (applicationId: string, agentName: string) => {
    Alert.alert(
      t('select_agent.confirm_title'),
      t('select_agent.confirm_body', { name: agentName }),
      [
        { text: t('detail.cancel_back'), style: 'cancel' },
        {
          text: t('select_agent.confirm_title'),
          onPress: async () => {
            setSelecting(applicationId);
            try {
              await bookingsApi.selectAgent(bookingId, { applicationId });
              Alert.alert(t('select_agent.success_title'), t('select_agent.success_body', { name: agentName }));
              navigation.goBack();
            } catch (err: unknown) {
              Alert.alert(t('detail.error_load'), (err as any)?.response?.data?.message ?? t('select_agent.error'));
            } finally {
              setSelecting(null);
            }
          },
        },
      ],
    );
  };

  const pendingApps = (booking?.applications ?? []).filter(a => a.status === 'PENDING');
  if (loading && !booking) return <LoadingState message={t('select_agent.loading')} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('select_agent.title')}
        subtitle={t(pendingApps.length === 1 ? 'select_agent.subtitle_one' : 'select_agent.subtitle_other', { count: pendingApps.length })}
        onBack={() => navigation.goBack()}
      />

      {pendingApps.length === 0 ? (
        <EmptyState Icon={Users} title={t('select_agent.empty_title')} subtitle={t('select_agent.empty_subtitle')} />
      ) : (
        <FlatList
          data={pendingApps}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>{t('select_agent.intro')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <AgentApplicationCard
              application={item}
              selectLabel={selecting === item.id ? t('select_agent.selecting') : t('select_agent.select_btn')}
              experiencedLabel={t('select_agent.experienced')}
              onSelect={() => handleSelect(item.id, item.agent?.fullName ?? 'Agent')}
              loading={selecting === item.id}
            />
          )}
        />
      )}
    </View>
  );
};

// ── AgentApplicationCard ──────────────────────────────────────────────────────
const AgentApplicationCard: React.FC<{
  application:      Application;
  selectLabel:      string;
  experiencedLabel: string;
  onSelect:         () => void;
  loading:          boolean;
}> = ({ application, selectLabel, experiencedLabel, onSelect, loading }) => {
  const agent     = application.agent;
  const rating    = agent?.avgRating ?? 0;
  const fullStars = Math.floor(rating);

  return (
    <Card elevated style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarRing}>
          <Avatar name={agent?.fullName} avatarUrl={(agent as any)?.avatarUrl} size={64} />
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent?.fullName ?? '—'}</Text>
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={13} color={s <= fullStars ? '#bc933b' : colors.border}
                strokeWidth={s <= fullStars ? 0 : 1.5} fill={s <= fullStars ? '#bc933b' : 'transparent'} />
            ))}
            <Text style={styles.ratingValue}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
          </View>
          <View style={styles.badgeRow}>
            {agent?.isValidated && <Badge label="CNAPS ✓" color={colors.success} bg={colors.successSurface} dot={false} />}
            {(agent as any)?.completedCount > 10 && <Badge label={experiencedLabel} color={colors.primary} bg={colors.primarySurface} dot={false} />}
          </View>
        </View>
      </View>

      <View style={styles.statsStrip}>
        <StatItem Icon={UserCheck} value={`${(agent as any)?.completedCount ?? 0}`} label="Missions" color={colors.primary} />
        <View style={styles.statDivider} />
        <StatItem Icon={Award}     value={rating > 0 ? `${rating.toFixed(1)}/5` : '—'}  label="Note"    color="#bc933b" />
        <View style={styles.statDivider} />
        <StatItem Icon={Briefcase} value={(agent as any)?.yearsExperience ? `${(agent as any).yearsExperience} ans` : '—'} label="Exp." color={colors.info} />
      </View>

      <Button label={selectLabel} onPress={onSelect} loading={loading} fullWidth size="md" />
    </Card>
  );
};

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;
const StatItem: React.FC<{ Icon: LucideIcon; value: string; label: string; color: string }> = ({ Icon, value, label, color }) => (
  <View style={statStyles.item}>
    <Icon size={14} color={color} strokeWidth={1.8} />
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);
const statStyles = StyleSheet.create({
  item:  { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontFamily: fontFamily.display, fontSize: fontSize.base, letterSpacing: -0.2 },
  label: { fontFamily: fontFamily.body,   fontSize: fontSize.xs,   color: colors.textMuted },
});

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: colors.background },
  list:           { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12], gap: spacing[4] },
  listHeader:     { marginBottom: spacing[2] },
  listHeaderText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.6 },
  card:           { gap: spacing[4] },
  cardTop:        { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  avatarRing:     { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.primary, overflow: 'hidden', flexShrink: 0, shadowColor: '#bc933b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  agentInfo:      { flex: 1, gap: spacing[2] },
  agentName:      { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing[1] },
  badgeRow:       { flexDirection: 'row', gap: spacing[2] },
  statsStrip:     { flexDirection: 'row', backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing[3] },
  statDivider:    { width: 1, backgroundColor: colors.border },
});
