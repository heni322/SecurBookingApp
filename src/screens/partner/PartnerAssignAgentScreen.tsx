/**
 * PartnerAssignAgentScreen — place one of the company's agents on a post.
 *
 * Added 2026-10-07 (mobile port of web /partner/staffing/[bookingId]).
 *
 *   GET   /bookings/get/:id/eligible-agents  the caller's OWN agents, each with
 *         `canBeAssigned` (the only field that decides) and human-readable
 *         `schedulingConflicts` (rest time, overlaps…) computed by the API.
 *   PATCH /bookings/select-agent/:id {agentId}  assigns. The API re-checks the
 *         agent's company, the post still being OPEN, and rest time inside a
 *         transaction under a per-agent lock — so a refusal here can be a real
 *         race, not a stale screen. Its 400 messages are specific and shown
 *         verbatim. On success the employment contract is drafted and
 *         employer-presigned automatically; the agent counter-signs.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Star, Heart, CalendarCheck, MapPin, TriangleAlert, XCircle, UserX } from 'lucide-react-native';
import { usePartnerT } from './_partnerI18n';
import { staffingApi, byAssignability, type EligibleAgent } from '@api/endpoints/bookings';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Avatar }       from '@components/ui/Avatar';
import { EmptyState }   from '@components/ui/EmptyState';
import { showAlert }    from '@components/ui/AlertModal';
import { useToast }     from '@hooks/useToast';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { PartnerStackParamList } from '@models/index';

type Props = NativeStackScreenProps<PartnerStackParamList, 'PartnerAssignAgent'>;

export const PartnerAssignAgentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId, label, when } = route.params;
  const { t } = usePartnerT();
  const toast = useToast();

  const [agents,     setAgents]     = useState<EligibleAgent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [assigning,  setAssigning]  = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const { data: res } = await staffingApi.eligibleAgents(bookingId);
      const list = ((res as any)?.data ?? res ?? []) as EligibleAgent[];
      setAgents(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? t('staffing.assign.errors.notFound') : (err?.response?.data?.message ?? t('staffing.error.body')));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [bookingId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sorted = useMemo(() => [...agents].sort(byAssignability), [agents]);

  /** Each refusal needs a different next step from the partner. */
  const errorMessage = (err: any): string => {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message;
    const text = Array.isArray(msg) ? String(msg[0]) : typeof msg === 'string' ? msg : '';
    if (!err?.response) return t('staffing.assign.errors.network');
    if (status === 400 && text) return text;               // rest time, wrong status… — specific, keep verbatim
    if (status === 403) return text && text !== 'Forbidden' ? text : t('staffing.assign.errors.forbidden');
    if (status === 404) return t('staffing.assign.errors.notFound');
    if (status === 409) return t('staffing.assign.errors.taken');
    return text || t('staffing.assign.errors.generic');
  };

  const assign = (a: EligibleAgent) => {
    showAlert(
      t('staffing.assign.confirmTitle'),
      t('staffing.assign.confirmBody', { agent: a.fullName }),
      [
        { text: t('staffing.assign.cancel'), style: 'cancel' },
        {
          text: t('staffing.assign.confirm'),
          onPress: async () => {
            setAssigning(a.id);
            try {
              await staffingApi.selectAgent(bookingId, a.id);
              toast.success(t('staffing.assign.success', { agent: a.fullName }));
              navigation.goBack(); // the queue reloads on focus; this post is gone
            } catch (err) {
              showAlert(t('staffing.assign.title'), errorMessage(err));
              load(true);
            } finally {
              setAssigning(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item: a }: { item: EligibleAgent }) => {
    const busy = assigning === a.id;
    return (
      <Card style={a.canBeAssigned ? styles.card : { ...styles.card, ...styles.cardMuted }}>
        <View style={styles.row}>
          <Avatar name={a.fullName} avatarUrl={a.avatarUrl} size="md" />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{a.fullName}</Text>
            <View style={styles.meta}>
              <Star size={12} color={colors.primary} fill={colors.primary} strokeWidth={1.5} />
              <Text style={styles.metaTxt}>{t('staffing.assign.rating', { rating: (a.avgRating ?? 0).toFixed(1), count: a.completedCount ?? 0 })}</Text>
            </View>
            <View style={styles.tags}>
              {a.isFavorite && (
                <View style={styles.tag}><Heart size={11} color={colors.primary} strokeWidth={2.2} /><Text style={styles.tagTxt}>{t('staffing.assign.favorite')}</Text></View>
              )}
              {a.hasDeclaredAvailability && (
                <View style={styles.tag}><CalendarCheck size={11} color={colors.success} strokeWidth={2.2} /><Text style={[styles.tagTxt, { color: colors.success }]}>{t('staffing.assign.available')}</Text></View>
              )}
              {typeof a.distanceKm === 'number' && (
                <View style={styles.tag}><MapPin size={11} color={colors.textMuted} strokeWidth={2.2} /><Text style={[styles.tagTxt, { color: colors.textSecondary }]}>{t('staffing.assign.distance', { km: Math.round(a.distanceKm) })}</Text></View>
              )}
            </View>
          </View>
          {a.canBeAssigned ? (
            <TouchableOpacity
              style={styles.cta}
              onPress={() => assign(a)}
              disabled={!!assigning}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${t('staffing.assign.cta')} ${a.fullName}`}
            >
              {busy ? <ActivityIndicator size="small" color={palette.navy} /> : <Text style={styles.ctaTxt}>{t('staffing.assign.cta')}</Text>}
            </TouchableOpacity>
          ) : (
            <Text style={styles.notAssignable}>{t('staffing.assign.notAssignable')}</Text>
          )}
        </View>
        {a.schedulingConflicts?.length > 0 && (
          <View style={styles.conflicts}>
            {a.schedulingConflicts.slice(0, 3).map((c, i) => (
              <View key={i} style={styles.conflictRow}>
                <TriangleAlert size={12} color={colors.warning} strokeWidth={2.2} />
                <Text style={styles.conflictTxt}>{c}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('staffing.assign.title')} subtitle={[label, when].filter(Boolean).join(' · ')} onBack={() => navigation.goBack()} showBack />
      {loading && agents.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={XCircle} title={t('staffing.error.title')} subtitle={error} actionLabel={t('staffing.retry')} onAction={() => load()} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={UserX} title={t('staffing.assign.empty')} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={a => a.id}
          renderItem={renderItem}
          ListHeaderComponent={<Text style={styles.intro}>{t('staffing.assign.intro')}</Text>}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
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
  intro:     { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing[3] },
  card:      { marginBottom: spacing[3], gap: spacing[2] },
  cardMuted: { opacity: 0.7 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  info:      { flex: 1, gap: 3 },
  name:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.textPrimary },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  tags:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: 2 },
  tag:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagTxt:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  cta:       { minWidth: 88, minHeight: 40, paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  ctaTxt:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: palette.navy },
  notAssignable: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, maxWidth: 90, textAlign: 'right' },
  conflicts:   { gap: 4, paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border },
  conflictRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  conflictTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.45 },
});
