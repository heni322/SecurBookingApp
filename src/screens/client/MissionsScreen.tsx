import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets }          from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertCircle, Plus, RefreshCw, Shield } from 'lucide-react-native';

import { missionsApi }         from '@api/endpoints/missions';
import { useApi }              from '@hooks/useApi';
import { MissionCard }         from '@components/domain/MissionCard';
import { EmptyState }          from '@components/ui/EmptyState';
import { FilterBar }           from '@components/ui/FilterBar';
import type { FilterChipDef }  from '@components/ui/FilterBar';
import { SearchBar }           from '@components/ui/SearchBar';
import { MissionListSkeleton } from '@components/ui/SkeletonLoader';
import { colors }              from '@theme/colors';
import { fontSize, fontFamily } from '@theme/typography';
import { layout, radius, spacing } from '@theme/spacing';
import { MissionStatus }       from '@constants/enums';
import type { Mission, MissionStackParamList } from '@models/index';
import type { MissionsNS }     from '@i18n/locales/types';
import { useTranslation }      from '@i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionList'>;

type FilterKey =
  | 'ALL'
  | 'ACTIVE'
  | typeof MissionStatus.CREATED
  | typeof MissionStatus.COMPLETED
  | typeof MissionStatus.CANCELLED;

type FilterCounts = Record<FilterKey, number>;

// ─────────────────────────────────────────────────────────────────────────────
// Module-level constants
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: ReadonlySet<MissionStatus> = new Set([
  MissionStatus.PUBLISHED,
  MissionStatus.STAFFING,
  MissionStatus.STAFFED,
  MissionStatus.IN_PROGRESS,
]);

const FILTER_KEYS: readonly FilterKey[] = [
  'ALL',
  'ACTIVE',
  MissionStatus.CREATED,
  MissionStatus.COMPLETED,
  MissionStatus.CANCELLED,
] as const;

const FILTER_I18N_KEY: Record<FilterKey, keyof MissionsNS['filters']> = {
  ALL:                       'all',
  ACTIVE:                    'active',
  [MissionStatus.CREATED]:   'created',
  [MissionStatus.COMPLETED]: 'completed',
  [MissionStatus.CANCELLED]: 'cancelled',
};

const SEARCH_DEBOUNCE_MS = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function matchesFilter(mission: Mission, filter: FilterKey): boolean {
  if (filter === 'ALL')    return true;
  if (filter === 'ACTIVE') return ACTIVE_STATUSES.has(mission.status as MissionStatus);
  return mission.status === filter;
}

function matchesSearch(mission: Mission, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const inField = (v?: string) => !!v && v.toLowerCase().includes(normalizedQuery);
  return inField(mission.title) || inField(mission.city) || inField(mission.address);
}

function buildCounts(missions: Mission[]): FilterCounts {
  const counts: FilterCounts = {
    ALL:    missions.length,
    ACTIVE: 0,
    [MissionStatus.CREATED]:   0,
    [MissionStatus.COMPLETED]: 0,
    [MissionStatus.CANCELLED]: 0,
  };
  for (const m of missions) {
    const status = m.status as MissionStatus;
    if (ACTIVE_STATUSES.has(status))            counts.ACTIVE++;
    if (status === MissionStatus.CREATED)        counts[MissionStatus.CREATED]++;
    if (status === MissionStatus.COMPLETED)      counts[MissionStatus.COMPLETED]++;
    if (status === MissionStatus.CANCELLED)      counts[MissionStatus.CANCELLED]++;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const MissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t }   = useTranslation('missions');
  const { top } = useSafeAreaInsets();

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: missions, loading, error, execute } = useApi(missionsApi.getMyMissions);

  // ── Initial fetch (run once) ────────────────────────────────────────────
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    execute();
  }, [execute]);

  // ── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const missionList = useMemo(() => missions ?? [], [missions]);
  const counts      = useMemo(() => buildCounts(missionList), [missionList]);

  const filtered = useMemo(() => {
    if (filter === 'ALL' && !debouncedSearch) return missionList;
    return missionList.filter(
      (m) => matchesFilter(m, filter) && matchesSearch(m, debouncedSearch),
    );
  }, [missionList, filter, debouncedSearch]);

  const total = counts.ALL;

  // ── Build FilterChipDef[] for FilterBar ─────────────────────────────────
  // Computed here so it reacts to counts + translations changing
  const filterChips = useMemo<FilterChipDef<FilterKey>[]>(() =>
    FILTER_KEYS.map((key) => ({
      key,
      label:    t(`filters.${FILTER_I18N_KEY[key]}`),
      count:    counts[key],
      dotColor: key === 'ACTIVE' ? colors.successSurface : undefined,
      variant:  (key === 'ALL' || key === 'ACTIVE') ? 'meta' : 'status',
    })),
    [counts, t],
  );

  // ── Empty-state copy ────────────────────────────────────────────────────
  const trimmedSearch = search.trim();
  const emptyTitle = trimmedSearch
    ? t('empty.no_results')
    : filter === 'ALL'
      ? t('empty.no_missions')
      : t('empty.filter_label', { filter: t(`filters.${FILTER_I18N_KEY[filter]}`) });

  const emptySubtitle = trimmedSearch
    ? t('empty.search_sub', { query: trimmedSearch })
    : filter === 'ALL' ? t('empty.all_sub') : t('empty.category_sub');

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRefresh      = useCallback(() => execute(), [execute]);
  const handleNewMission   = useCallback(() => navigation.navigate('ServicePicker', {}), [navigation]);
  const handleMissionPress = useCallback(
    (id: string) => navigation.navigate('MissionDetail', { missionId: id }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Mission }) => (
      <MissionCard mission={item} onPress={() => handleMissionPress(item.id)} />
    ),
    [handleMissionPress],
  );

  const keyExtractor = useCallback((item: Mission) => item.id, []);

  const isFirstLoad  = loading && missions === null;
  const isErrorState = !!error && !missions;

  // ── Renderers ───────────────────────────────────────────────────────────
  const renderContent = () => {
    if (isFirstLoad) {
      return (
        <View
          style={styles.skeletonWrap}
          accessibilityLabel={t('a11y.loading')}
          accessibilityLiveRegion="polite"
        >
          <MissionListSkeleton count={5} />
        </View>
      );
    }

    if (isErrorState) {
      return (
        <View style={styles.errorWrap} accessibilityRole="alert">
          <AlertCircle size={40} color={colors.danger} />
          <Text style={styles.errorTitle}>{t('error.title')}</Text>
          <Text style={styles.errorSubtitle}>{t('error.subtitle')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.retry')}
          >
            <RefreshCw size={14} color={colors.textInverse} />
            <Text style={styles.retryBtnText}>{t('error.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            accessibilityLabel={t('a11y.refreshing')}
          />
        }
        ListEmptyComponent={
          <EmptyState
            Icon={Shield}
            title={emptyTitle}
            subtitle={emptySubtitle}
            actionLabel={!trimmedSearch && filter === 'ALL' ? t('empty.action') : undefined}
            onAction={!trimmedSearch && filter === 'ALL' ? handleNewMission : undefined}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
      />
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: top + spacing[4] }]}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">{t('title')}</Text>
          <Text style={styles.subtitle} accessibilityLiveRegion="polite">
            {t('subtitle', { count: total })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={handleNewMission}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.new_mission')}
        >
          <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.newBtnText}>{t('new')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('search_placeholder')}
        />
      </View>

      {/* Filters — fully extracted, zero chip logic remains here */}
      <FilterBar
        filters={filterChips}
        activeKey={filter}
        onChange={setFilter}
        accessibilityLabel={t('a11y.filter_bar')}
      />

      {/* Content */}
      {renderContent()}

    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles — screen-level only, all chip styles live in FilterBar.tsx
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[3],
  },
  headerText: { flex: 1, marginRight: spacing[4] },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    marginTop:  spacing[1],
  },
  newBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2,
    borderRadius:   radius.full,
    shadowColor:    colors.primary,
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.35,
    shadowRadius:   8,
    elevation:      5,
  },
  newBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    color:      colors.textInverse,
  },

  searchWrap: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[2],
  },

  skeletonWrap: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
  },
  list: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[12],
    flexGrow:          1,
  },
  listEmpty: { flex: 1 },

  errorWrap: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPaddingH,
    gap:               spacing[3],
  },
  errorTitle: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize.lg,
    color:      colors.textPrimary,
    textAlign:  'center',
    marginTop:  spacing[2],
  },
  errorSubtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  retryBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius:   radius.full,
    marginTop:      spacing[2],
    shadowColor:    colors.primary,
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.3,
    shadowRadius:   6,
    elevation:      4,
  },
  retryBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    color:      colors.textInverse,
  },
});
