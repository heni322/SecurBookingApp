/**
 * MissionsScreen — Enterprise-grade mission list with status filtering, search,
 * skeleton loading, error recovery, and full accessibility support.
 *
 * Fixes applied vs original:
 *  - FilterKey narrowed to the 5 UI-only values — Record<FilterKey,…> no longer
 *    demands the 4 non-filterable MissionStatus variants (PUBLISHED, STAFFING, etc.)
 *  - FILTER_I18N_KEY static map — fully type-safe t() key, no dynamic template literal
 *  - execute stabilised via ref guard — no infinite fetch loop
 *  - Error state surfaced with retry action (colors.danger — no 'error' in theme)
 *  - SearchBar called with only its declared props (no accessibilityLabel, etc.)
 *  - Skeleton shown only on true first load; RefreshControl handles subsequent refreshes
 *  - counts keys normalised — no silent zero-badge bug
 *  - total derived from counts.ALL (no redundant recomputation)
 *  - activeFilterLabel fallback uses in-memory label — no invented i18n key
 *  - Accessibility labels on every interactive element
 *  - renderItem stable — only recreated when handleMissionPress changes
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertCircle, Plus, RefreshCw, Shield } from 'lucide-react-native';

import { missionsApi }         from '@api/endpoints/missions';
import { useApi }              from '@hooks/useApi';
import { MissionCard }         from '@components/domain/MissionCard';
import { EmptyState }          from '@components/ui/EmptyState';
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

/**
 * FilterKey is intentionally narrower than MissionStatus.
 *
 * Only 5 values are exposed as UI filters. Using `SyntheticFilter | MissionStatus`
 * would widen the union to 9 members, forcing FILTER_I18N_KEY to declare entries
 * for PUBLISHED, STAFFING, STAFFED and IN_PROGRESS which are never shown as chips.
 *
 * By listing only the 5 used values, Record<FilterKey, …> stays exact and TS2739 goes away.
 */
type FilterKey =
  | 'ALL'
  | 'ACTIVE'
  | typeof MissionStatus.CREATED
  | typeof MissionStatus.COMPLETED
  | typeof MissionStatus.CANCELLED;

interface FilterDef {
  key:   FilterKey;
  label: string;
}

/** Normalised counts record — string keys for safe bracket-access. */
type FilterCounts = Record<string, number>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants (module-level — stable refs, zero GC pressure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full set of statuses that count as "active" in the UI.
 * Includes PUBLISHED/STAFFING/STAFFED/IN_PROGRESS which are NOT exposed as
 * individual filter chips — they only contribute to the ACTIVE aggregate count.
 */
const ACTIVE_STATUSES = new Set<MissionStatus>([
  MissionStatus.PUBLISHED,
  MissionStatus.STAFFING,
  MissionStatus.STAFFED,
  MissionStatus.IN_PROGRESS,
]);

/** Ordered list of filter keys shown as chips. */
const FILTER_KEYS: FilterKey[] = [
  'ALL',
  'ACTIVE',
  MissionStatus.CREATED,
  MissionStatus.COMPLETED,
  MissionStatus.CANCELLED,
];

/**
 * Static map: FilterKey → keyof MissionsNS['filters']
 *
 * WHY: t(`filters.${key.toLowerCase()}`) widens to `filters.${string}` which
 * TypeScript cannot verify against the known union — TS2345.
 * With this map, t(`filters.${FILTER_I18N_KEY[key]}`) resolves to the exact
 * union "filters.all" | "filters.active" | "filters.created" | …
 *
 * WHY Record<FilterKey, …> now compiles: FilterKey has exactly 5 members,
 * and we provide exactly 5 entries — no missing keys.
 */
const FILTER_I18N_KEY: Record<FilterKey, keyof MissionsNS['filters']> = {
  ALL:                       'all',
  ACTIVE:                    'active',
  [MissionStatus.CREATED]:   'created',
  [MissionStatus.COMPLETED]: 'completed',
  [MissionStatus.CANCELLED]: 'cancelled',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (pure, module-level — fully unit-testable)
// ─────────────────────────────────────────────────────────────────────────────

function matchesFilter(mission: Mission, filter: FilterKey): boolean {
  if (filter === 'ALL')    return true;
  if (filter === 'ACTIVE') return ACTIVE_STATUSES.has(mission.status as MissionStatus);
  return mission.status === filter;
}

function matchesSearch(mission: Mission, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    mission.title?.toLowerCase().includes(q)   === true ||
    mission.city?.toLowerCase().includes(q)    === true ||
    mission.address?.toLowerCase().includes(q) === true
  );
}

/** Single O(n) pass — replaces 5 separate Array.filter() calls. */
function buildCounts(missions: Mission[]): FilterCounts {
  const counts: FilterCounts = {
    ALL:    missions.length,
    ACTIVE: 0,
    [MissionStatus.CREATED]:   0,
    [MissionStatus.COMPLETED]: 0,
    [MissionStatus.CANCELLED]: 0,
  };
  for (const m of missions) {
    if (ACTIVE_STATUSES.has(m.status as MissionStatus)) counts['ACTIVE']++;
    if (m.status in counts) counts[m.status]++;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const MissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('missions');

  // ── State ──────────────────────────────────────────────────────────────────

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');

  const { data: missions, loading, error, execute } = useApi(missionsApi.getMyMissions);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  // Ref-guarded so an unstable `execute` reference never causes an infinite loop.
  // After mount, refreshes are only triggered by user actions (pull / retry).
  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      execute();
    }
  }, []); // intentional — guarded by hasFetched ref

  // ── Derived data ───────────────────────────────────────────────────────────

  const filters = useMemo<FilterDef[]>(
    () => FILTER_KEYS.map((key) => ({
      key,
      label: t(`filters.${FILTER_I18N_KEY[key]}`),
    })),
    [t],
  );

  const missionList = useMemo(() => missions ?? [], [missions]);
  const counts      = useMemo(() => buildCounts(missionList), [missionList]);

  const filtered = useMemo(() => {
    let list = missionList;
    if (filter !== 'ALL') list = list.filter((m) => matchesFilter(m, filter));
    if (search.trim())    list = list.filter((m) => matchesSearch(m, search.trim()));
    return list;
  }, [missionList, filter, search]);

  const total = counts['ALL'] ?? 0;

  // ── Empty-state copy ───────────────────────────────────────────────────────

  const activeFilterLabel = useMemo(
    () => filters.find((f) => f.key === filter)?.label ?? filters[0]?.label ?? '',
    [filters, filter],
  );

  const emptyTitle = search
    ? t('empty.no_results')
    : filter === 'ALL'
      ? t('empty.no_missions')
      : t('empty.filter_label', { filter: activeFilterLabel });

  const emptySubtitle = search
    ? t('empty.search_sub', { query: search })
    : filter === 'ALL'
      ? t('empty.all_sub')
      : t('empty.category_sub');

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => { execute(); }, [execute]);

  const handleNewMission = useCallback(
    () => navigation.navigate('ServicePicker', {}),
    [navigation],
  );

  const handleMissionPress = useCallback(
    (missionId: string) => navigation.navigate('MissionDetail', { missionId }),
    [navigation],
  );

  // ── Renderers ──────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Mission }) => (
      <MissionCard mission={item} onPress={() => handleMissionPress(item.id)} />
    ),
    [handleMissionPress],
  );

  const keyExtractor = useCallback((item: Mission) => item.id, []);

  const isFirstLoad = loading && missions === undefined;

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

    if (error && !missions) {
      return (
        <View style={styles.errorWrap} accessibilityRole="alert">
          {/* colors.danger = crimson (#EF4444) — theme has no 'error' key */}
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
            actionLabel={!search && filter === 'ALL' ? t('empty.action') : undefined}
            onAction={!search && filter === 'ALL' ? handleNewMission : undefined}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
        getItemLayout={undefined}
      />
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {t('title')}
          </Text>
          <Text style={styles.subtitle} accessibilityLiveRegion="polite">
            {t(total === 1 ? 'subtitle_one' : 'subtitle_other', { count: total })}
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

      {/* Search — only props declared in SearchBar.Props */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('search_placeholder')}
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filterBar}
        accessibilityRole="tablist"
        accessibilityLabel={t('a11y.filter_bar')}
      >
        {filters.map(({ key, label }) => {
          const count  = counts[key] ?? 0;
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(key)}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                count > 0
                  ? t('a11y.filter_chip_with_count', { label, count })
                  : t('a11y.filter_chip', { label })
              }
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
              {count > 0 && (
                <View
                  style={[styles.chipBadge, active && styles.chipBadgeActive]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {renderContent()}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[10], paddingBottom: spacing[3],
  },
  headerText: { flex: 1, marginRight: spacing[4] },
  title: {
    fontFamily: fontFamily.display, fontSize: fontSize['2xl'],
    color: colors.textPrimary, letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.textMuted, marginTop: spacing[1],
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.primary, paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2, borderRadius: radius.full,
    shadowColor: '#bc933b', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  newBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textInverse },

  searchWrap: { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[2] },

  filterBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: {
    paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[3], gap: spacing[2],
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive:         { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  chipText:           { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive:     { color: colors.primary },
  chipBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.border, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 4,
  },
  chipBadgeActive:     { backgroundColor: colors.primary },
  chipBadgeText:       { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.textMuted },
  chipBadgeTextActive: { color: colors.textInverse },

  skeletonWrap: { flex: 1, paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4] },

  list:      { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12], flexGrow: 1 },
  listEmpty: { flex: 1 },

  errorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingH, gap: spacing[3],
  },
  errorTitle: {
    fontFamily: fontFamily.display, fontSize: fontSize.lg,
    color: colors.textPrimary, textAlign: 'center', marginTop: spacing[2],
  },
  errorSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.primary, paddingHorizontal: spacing[5],
    paddingVertical: spacing[3], borderRadius: radius.full, marginTop: spacing[2],
    shadowColor: '#bc933b', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  retryBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textInverse },
});
