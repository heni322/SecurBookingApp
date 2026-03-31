/**
 * SelectAgentScreen — sélection d'agent parmi les candidatures d'un booking.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Star, ShieldCheck, UserCheck, Users } from 'lucide-react-native';
import { bookingsApi } from '@api/endpoints/bookings';
import { useApi }      from '@hooks/useApi';
import { Avatar }      from '@components/ui/Avatar';
import { Badge }       from '@components/ui/Badge';
import { Button }      from '@components/ui/Button';
import { Card }        from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState }   from '@components/ui/EmptyState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { Application, MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'SelectAgent'>;

export const SelectAgentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { data: booking, loading, execute } = useApi(bookingsApi.getById);
  const [selecting, setSelecting] = useState<string | null>(null);

  const load = useCallback(() => execute(bookingId), [execute, bookingId]);
  useEffect(() => { load(); }, [load]);

  const handleSelect = async (applicationId: string, agentName: string) => {
    Alert.alert(
      'Confirmer la sélection',
      `Assigner ${agentName} à ce poste ? Les autres candidatures seront automatiquement refusées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setSelecting(applicationId);
            try {
              await bookingsApi.selectAgent(bookingId, { applicationId });
              Alert.alert('Agent sélectionné', `${agentName} a été assigné à ce poste.`);
              navigation.goBack();
            } catch (err: unknown) {
              const msg = (err as any)?.response?.data?.message ?? "Impossible de sélectionner cet agent";
              Alert.alert('Erreur', msg);
            } finally {
              setSelecting(null);
            }
          },
        },
      ],
    );
  };

  const pendingApps = (booking?.applications ?? []).filter((a) => a.status === 'PENDING');

  if (loading && !booking) return <LoadingState message="Chargement des candidatures…" />;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Sélectionner un agent"
        subtitle={`${pendingApps.length} candidature${pendingApps.length > 1 ? 's' : ''} en attente`}
        onBack={() => navigation.goBack()}
      />

      {pendingApps.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucune candidature"
          subtitle="Aucun agent n'a encore postulé à ce poste."
        />
      ) : (
        <FlatList
          data={pendingApps}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Users size={16} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.listHeaderText}>
                Choisissez l'agent qui interviendra sur ce poste
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AgentApplicationCard
              application={item}
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
  application: Application;
  onSelect:    () => void;
  loading:     boolean;
}> = ({ application, onSelect, loading }) => {
  const agent = application.agent;

  return (
    <Card style={styles.card} elevated>
      <View style={styles.cardTop}>
        <Avatar
          fullName={agent?.fullName}
          avatarUrl={agent?.avatarUrl}
          size="lg"
        />
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent?.fullName ?? '—'}</Text>
          <View style={styles.badges}>
            {agent?.isValidated && (
              <Badge label="CNAPS ✓" color={colors.success} bg={colors.successSurface} />
            )}
          </View>
          <View style={styles.stats}>
            <StatPill Icon={Star}      value={`${agent?.avgRating?.toFixed(1) ?? '—'}`} color={colors.warning} />
            <StatPill Icon={UserCheck} value={`${agent?.completedCount ?? 0} missions`} color={colors.primary} />
          </View>
        </View>
      </View>

      <Button
        label="Sélectionner cet agent"
        onPress={onSelect}
        loading={loading}
        fullWidth
        size="md"
        style={styles.selectBtn}
      />
    </Card>
  );
};

const StatPill: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  value: string;
  color: string;
}> = ({ Icon, value, color }) => (
  <View style={pillStyles.wrap}>
    <Icon size={13} color={color} strokeWidth={2} />
    <Text style={pillStyles.value}>{value}</Text>
  </View>
);

const pillStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: colors.background },
  list:       { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[4], gap: spacing[3] },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  listHeaderText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    flex:       1,
  },
  card:      { gap: spacing[3] },
  cardTop:   { flexDirection: 'row', gap: spacing[4], alignItems: 'center' },
  agentInfo: { flex: 1, gap: spacing[2] },
  agentName: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  badges:    { flexDirection: 'row', gap: spacing[2] },
  stats:     { flexDirection: 'row', gap: spacing[4] },
  selectBtn: { marginTop: spacing[2] },
});
