/**
 * MissionsScreen — Enterprise-grade mission list with status filtering, search,
 * skeleton loading, error recovery, and full accessibility support.
 *
 * Bugs fixed in this revision:
 *  [1] useMemo([t]) stale labels — i18next v26 + react-i18next v17 with async
 *      languageDetector (AsyncStorage): `t` reference is STABLE, so useMemo
 *      computed once at mount while i18next wasn't ready (returned '' or key
 *      strings), never recomputed. Fix: add i18n.language to the dep array —
 *      it changes from undefined → 'fr'/'en' when async detection completes,
 *      guaranteeing recomputation with real translations.
 *  [2] isFirstLoad always false — useApi initialises data as null, not
 *      undefined. `missions === undefined` was always false → skeleton never
 *      showed. Fix: `missions === null`.
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
 * Only 5 values are exposed as UI filter chips. Widening to the full
 * MissionStatus union (7 values) forces FILTER_I18N_KEY to declare
 * PUBLISHED/STAFFING/STAFFED/IN_PROGRESS which are never shown as chips.
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

type FilterCounts = Record<string, number>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants (module-level — stable refs, zero GC pressure)
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set<MissionStatus>([
  MissionStatus.PUBLISHED,
  MissionStatus.STAFFING,
  MissionStatus.STAFFED,
  MissionStatus.IN_PROGRESS,
]);

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
 * WHY: t(`filters.${key.toLowerCase()}`) widens to `filters.${string}` — TS2345.
 * This map narrows the lookup to the exact 5-member union that MissionsNS defines.
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
  // Destructure i18n alongside t.
  // i18n.language is the dependency that changes when the async languageDetector
  // (AsyncStorage) resolves — this is what triggers filters to recompute.
  const { t, i18n } = useTranslation('missions');

  // ── State ──────────────────────────────────────────────────────────────────

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');

  const { data: missions, loading, error, execute } = useApi(missionsApi.getMyMissions);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      execute();
    }
  }, []); // intentional — guarded by hasFetched ref

  // ── Derived data ───────────────────────────────────────────────────────────

  /**
   * FIX [1] — add i18n.language to the dependency array.
   *
   * In i18next v26 + react-i18next v17, `t` is a stable reference: it does not
   * change object identity when i18next finishes async initialization. A memo
   * keyed only on [t] would compute once at mount (while i18next is unready,
   * returning '' or the raw key) and never recompute — so labels stayed empty
   * even after translations were loaded, while API data caused counts/badges
   * to update correctly.
   *
   * i18n.language goes from undefined → 'fr' (or 'en') the moment the async
   * languageDetector callback fires, reliably invalidating this memo.
   */
  const filters = useMemo<FilterDef[]>(
    () => FILTER_KEYS.map((key) => ({
      key,
      label: t(`filters.${FILTER_I18N_KEY[key]}`),
    })),
    [t, i18n.language], // ← i18n.language is the missing trigger
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

  /**
   * FIX [2] — useApi initialises data as null (not undefined).
   * `missions === undefined` was always false → skeleton never showed.
   * Correct check: missions === null (the initial state from useApi).
   */
  const isFirstLoad = loading && missions === null;

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
          {/* colors.danger = crimson — theme has no 'error' key */}
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
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
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
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  retryBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textInverse },
});

