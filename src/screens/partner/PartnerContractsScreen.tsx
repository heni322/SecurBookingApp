/**
 * PartnerContractsScreen — the company's employment contracts.
 *
 * Added 2026-10-07 (partner audit). PartnerContractDetailScreen existed but no
 * screen led to it, so a partner could not see a contract, its agent
 * signature, its DPAE status or its PDF on mobile.
 *
 * Contracts are created and employer-presigned automatically when an agent is
 * assigned (PLATFORM_AUTO_PRESIGN); the agent counter-signs, then the DPAE is
 * created. So this list is about follow-up, not signature: who still has to
 * sign, and where each DPAE stands. GET /employment/contracts is scoped to the
 * partner's company server-side.
 */
import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileSignature, CalendarClock, MapPin, ChevronRight, CircleCheckBig, Clock3, XCircle } from 'lucide-react-native';
import { usePartnerT } from './_partnerI18n';
import { useContracts } from '@api/queries/employment';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Badge }        from '@components/ui/Badge';
import { EmptyState }   from '@components/ui/EmptyState';
import { colors } from '@theme/colors';
import { spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime }  from '@utils/formatters';
import type { EmploymentContract, PartnerStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<PartnerStackParamList>;

/** List rows carry the agent and mission (included by the API for this list). */
type ContractRow = EmploymentContract & {
  agent?: { id: string; firstName: string | null; lastName: string | null } | null;
  booking?: { id: string; mission?: { id: string; title: string | null; city: string | null } | null } | null;
  dpae?: { status: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: colors.textMuted,
  SENT_FOR_SIGNATURE: colors.info,
  SIGNED: colors.success,
  CANCELLED: colors.danger,
};

export const PartnerContractsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();
  const q = useContracts({ limit: 100 });

  // Signatures and DPAE move outside the app: refresh whenever we come back.
  useFocusEffect(useCallback(() => { q.refetch(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const rows = ((q.data?.data ?? []) as ContractRow[]);

  const renderItem = ({ item: c }: { item: ContractRow }) => {
    const name = [c.agent?.firstName, c.agent?.lastName].filter(Boolean).join(' ') || t('contractsList.unknownAgent');
    const mission = c.booking?.mission?.title?.trim() || c.booking?.mission?.city || '—';
    const color = STATUS_COLOR[c.status] ?? colors.textMuted;
    const agentSigned = !!c.agentSignedAt;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PartnerContractDetail', { contractId: c.id, bookingId: c.bookingId })}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${t(`employment.status.${c.status}`, { defaultValue: c.status })}`}
      >
        <Card style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Badge label={t(`employment.status.${c.status}`, { defaultValue: c.status })} color={color} bg={color + '20'} />
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
          </View>
          <View style={styles.meta}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaTxt} numberOfLines={1}>{mission}</Text>
          </View>
          <View style={styles.meta}>
            <CalendarClock size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaTxt}>{`${formatDate(c.startAt)} · ${formatTime(c.startAt)}–${formatTime(c.endAt)}`}</Text>
          </View>
          {c.status !== 'CANCELLED' && (
            <View style={styles.meta}>
              {agentSigned
                ? <CircleCheckBig size={14} color={colors.success} strokeWidth={2} />
                : <Clock3 size={14} color={colors.warning} strokeWidth={2} />}
              <Text style={[styles.metaTxt, { color: agentSigned ? colors.success : colors.warning }]}>
                {agentSigned ? t('contractsList.agentSigned') : t('contractsList.awaitingAgent')}
              </Text>
            </View>
          )}
          {c.dpae?.status ? (
            <Text style={styles.dpae}>
              {`${t('contractsList.dpae')} · ${t(`employment.contract.detail.dpae.status.${c.dpae.status}`, { defaultValue: c.dpae.status })}`}
            </Text>
          ) : null}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('contractsList.title')} subtitle={t('contractsList.subtitle')} onBack={() => navigation.goBack()} showBack />
      {q.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : q.isError && rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={XCircle} title={t('contractsList.error.title')} subtitle={t('contractsList.error.body')}
            actionLabel={t('contractsList.retry')} onAction={() => q.refetch()} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={FileSignature} title={t('contractsList.empty.title')} subtitle={t('contractsList.empty.body')} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.primary} />}
          ListFooterComponent={<View style={{ height: spacing[8] }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: layout.screenPaddingH },
  content:   { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[3] },
  card:      { marginBottom: spacing[3], gap: spacing[2] },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  name:      { flex: 1, fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  metaTxt:   { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  dpae:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
});
