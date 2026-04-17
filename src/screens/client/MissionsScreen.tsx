/**
 * MissionsScreen — Mission list with status filtering, search, skeleton.
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, Shield } from 'lucide-react-native';
import { missionsApi }         from '@api/endpoints/missions';
import { useApi }              from '@hooks/useApi';
import { MissionCard }         from '@components/domain/MissionCard';
import { EmptyState }          from '@components/ui/EmptyState';
import { SearchBar }           from '@components/ui/SearchBar';
import { MissionListSkeleton } from '@components/ui/SkeletonLoader';
import { colors }              from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { MissionStatus }       from '@constants/enums';
import type { Mission, MissionStackParamList } from '@models/index';
import { useTranslation }      from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionList'>;

type FilterKey = 'ALL' | 'ACTIVE' | MissionStatus;

const ACTIVE_STATUSES = new Set<string>([
  MissionStatus.PUBLISHED,
  MissionStatus.IN_PROGRESS,
  MissionStatus.CONFIRMED,
]);

export const MissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('missions');

  // Build filter definitions inside component so labels are reactive to locale changes
  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'ALL',                    label: t('filters.all')       },
    { key: 'ACTIVE',                 label: t('filters.active')    },
    { key: MissionStatus.DRAFT,      label: t('filters.drafts')    },
    { key: MissionStatus.COMPLETED,  label: t('filters.completed') },
    { key: MissionStatus.CANCELLED,  label: t('filters.cancelled') },
  ];

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const { data: missions, loading, execute } = useApi(missionsApi.getMyMissions);

  useEffect(() => { execute(); }, [execute]);

  const filtered = useMemo(() => {
    const all  = missions ?? [];
    let list   = all;
    if (filter === 'ACTIVE')      list = list.filter(m => ACTIVE_STATUSES.has(m.status));
    else if (filter !== 'ALL')    list = list.filter(m => m.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q)  ||
        m.address?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [missions, filter, search]);

  const counts = useMemo(() => {
    const all = missions ?? [];
    return {
      ALL:    all.length,
      ACTIVE: all.filter(m => ACTIVE_STATUSES.has(m.status)).length,
      [MissionStatus.DRAFT]:     all.filter(m => m.status === MissionStatus.DRAFT).length,
      [MissionStatus.COMPLETED]: all.filter(m => m.status === MissionStatus.COMPLETED).length,
      [MissionStatus.CANCELLED]: all.filter(m => m.status === MissionStatus.CANCELLED).length,
    } as Record<string, number>;
  }, [missions]);

  const renderItem = useCallback(({ item }: { item: Mission }) => (
    <MissionCard mission={item} onPress={() => navigation.navigate('MissionDetail', { missionId: item.id })} />
  ), [navigation]);

  const keyExtractor = useCallback((item: Mission) => item.id, []);

  const total = (missions ?? []).length;

  // Derive empty-state copy based on active filter / search
  const emptyTitle = search
    ? t('empty.no_results')
    : filter === 'ALL'
      ? t('empty.no_missions')
      : t('empty.filter_label', { filter: FILTERS.find(f => f.key === filter)?.label ?? filter });

  const emptySubtitle = search
    ? t('empty.search_sub', { query: search })
    : filter === 'ALL'
      ? t('empty.all_sub')
      : t('empty.category_sub');

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.subtitle}>
            {t(total === 1 ? 'subtitle_one' : 'subtitle_other', { count: total })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('ServicePicker', {})}
          activeOpacity={0.82}
        >
          <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.newBtnText}>{t('new')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('search_placeholder')} />
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterBar}
      >
        {FILTERS.map(({ key, label }) => {
          const count  = counts[key] ?? 0;
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              {count > 0 && (
                <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                  <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading && !missions ? (
        <View style={styles.skeletonWrap}><MissionListSkeleton count={5} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={execute} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              Icon={Shield}
              title={emptyTitle}
              subtitle={emptySubtitle}
              actionLabel={!search && filter === 'ALL' ? t('empty.action') : undefined}
              onAction={!search && filter === 'ALL' ? () => navigation.navigate('ServicePicker', {}) : undefined}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[10], paddingBottom: spacing[3] },
  title:            { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6 },
  subtitle:         { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing[1] },
  newBtn:           { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingVertical: spacing[2] + 2, borderRadius: radius.full, shadowColor: '#bc933b', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  newBtnText:       { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textInverse },
  searchWrap:       { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[2] },
  filterBar:        { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  filters:          { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[3], gap: spacing[2] },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:       { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  chipText:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive:   { color: colors.primary },
  chipBadge:        { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipBadgeActive:  { backgroundColor: colors.primary },
  chipBadgeText:    { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.textMuted },
  chipBadgeTextActive: { color: colors.textInverse },
  skeletonWrap:     { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4] },
  list:             { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12], flexGrow: 1 },
});