/**
 * PartnerStaffingScreen — open posts the partner can staff with its agents.
 *
 * Added 2026-10-07 (partner audit): staffing existed only on the web
 * (/partner/staffing); a partner on the move could not place an agent.
 * Same API and model as the web:
 *
 *   GET /bookings/staffing  — PAID missions' OPEN posts, platform-wide. The
 *   queue is deliberately open: partner companies compete to staff posts,
 *   each placing its OWN agents (authorisation is on the targeted agent, at
 *   PATCH /bookings/select-agent). The API exposes no client / agency
 *   filters here, so partners cannot enumerate clients or competitors.
 *
 * Tap a post → PartnerAssignAgentScreen (eligible agents of the company).
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, CalendarClock, Users, Zap, Search, X, ChevronRight, Inbox, XCircle } from 'lucide-react-native';
import { usePartnerT } from './_partnerI18n';
import { staffingApi, type StaffingRow, type StaffingPage } from '@api/endpoints/bookings';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { EmptyState }   from '@components/ui/EmptyState';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime }  from '@utils/formatters';
import type { PartnerStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<PartnerStackParamList>;
const PAGE = 30;

export const PartnerStaffingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();

  const [rows,       setRows]       = useState<StaffingRow[]>([]);
  const [page,       setPage]       = useState(1);
  const [hasNext,    setHasNext]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [city,       setCity]       = useState('');
  const cityRef  = useRef('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, mode: 'initial' | 'refresh' | 'more') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more')    setLoadingMore(true);
    setError(null);
    try {
      const { data: res } = await staffingApi.queue({ city: cityRef.current.trim() || undefined, page: p, limit: PAGE });
      const body = ((res as any)?.data ?? res) as StaffingPage;
      setRows(prev => (p === 1 ? body.data ?? [] : [...prev, ...(body.data ?? [])]));
      setPage(p);
      setHasNext(!!body.meta?.hasNext);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('staffing.error.body'));
      if (p === 1) setRows([]);
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, [t]);

  // Re-load on focus: a post assigned on the next screen must leave the list.
  useFocusEffect(useCallback(() => { load(1, 'initial'); }, [load]));

  const onCity = (v: string) => {
    setCity(v);
    cityRef.current = v;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, 'initial'), 400);
  };

  const when = (r: StaffingRow) => {
    const s = r.slot?.startAt ?? r.mission.startAt;
    const e = r.slot?.endAt ?? r.mission.endAt;
    if (!s) return t('staffing.noSlot');
    return `${formatDate(s)} · ${formatTime(s)}${e ? `–${formatTime(e)}` : ''}`;
  };

  const renderItem = ({ item: r }: { item: StaffingRow }) => {
    const label = r.mission.title?.trim() || r.serviceType?.name || r.mission.city || '—';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PartnerAssignAgent', { bookingId: r.bookingId, label, when: when(r) })}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${when(r)}`}
      >
        <Card style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>{label}</Text>
            {r.mission.isUrgent && (
              <View style={styles.urgent}>
                <Zap size={11} color={palette.gold} strokeWidth={2.4} />
                <Text style={styles.urgentTxt}>{t('staffing.urgent')}</Text>
              </View>
            )}
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
          </View>
          {r.serviceType?.name && r.mission.title ? <Text style={styles.service}>{r.serviceType.name}</Text> : null}
          <View style={styles.meta}>
            <CalendarClock size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaTxt}>{when(r)}</Text>
          </View>
          <View style={styles.meta}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaTxt} numberOfLines={1}>
              {[r.mission.zipCode, r.mission.city].filter(Boolean).join(' ') || '—'}
            </Text>
          </View>
          <View style={styles.meta}>
            <Users size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaTxt}>
              {t('staffing.filled', { assigned: r.effectif.assigned, requested: r.effectif.requested })}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('staffing.title')} subtitle={t('staffing.subtitle')} onBack={() => navigation.goBack()} showBack />

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.search}
          value={city}
          onChangeText={onCity}
          placeholder={t('staffing.cityPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
        />
        {city.length > 0 && (
          <TouchableOpacity onPress={() => onCity('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t('common:clear')}>
            <X size={14} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : error && rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={XCircle} title={t('staffing.error.title')} subtitle={error}
            actionLabel={t('staffing.retry')} onAction={() => load(1, 'initial')} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState Icon={Inbox} title={t('staffing.empty.title')} subtitle={t('staffing.empty.body')} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.bookingId}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} tintColor={colors.primary} />}
          onEndReached={() => { if (hasNext && !loadingMore) load(page + 1, 'more'); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[4] }} /> : <View style={{ height: spacing[8] }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: layout.screenPaddingH },
  content:   { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[2] },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    marginHorizontal: layout.screenPaddingH, marginTop: spacing[3], marginBottom: spacing[2],
    height: 44, paddingHorizontal: spacing[3], borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  search:  { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary, height: '100%' },
  card:    { marginBottom: spacing[3], gap: spacing[2] },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title:   { flex: 1, fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  service: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  urgent:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.amberDim, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.sm },
  urgentTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.gold },
  meta:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  metaTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
});
