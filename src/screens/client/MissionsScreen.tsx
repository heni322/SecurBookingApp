/**
 * MissionsScreen — liste complète des missions du client avec filtres de statut.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { missionsApi }  from '@api/endpoints/missions';
import { useApi }       from '@hooks/useApi';
import { MissionCard }  from '@components/domain/MissionCard';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState }   from '@components/ui/EmptyState';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { MissionStatus } from '@constants/enums';
import type { Mission, MissionStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<MissionStackParamList>;

const ACTIVE_STATUSES = [
  MissionStatus.CONFIRMED,
  MissionStatus.PUBLISHED,
  MissionStatus.IN_PROGRESS,
];

type FilterValue = string | string[] | null;

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: 'Toutes',     value: null                   },
  { label: 'En cours',  value: ACTIVE_STATUSES         },
  { label: 'Publiées',  value: MissionStatus.PUBLISHED  },
  { label: 'Brouillons', value: MissionStatus.DRAFT     },
  { label: 'Terminées', value: MissionStatus.COMPLETED  },
  { label: 'Annulées',  value: MissionStatus.CANCELLED  },
];

const isFilterActive = (active: FilterValue, value: FilterValue): boolean => {
  if (active === null && value === null) return true;
  if (Array.isArray(active) && Array.isArray(value))
    return active.length === value.length && active.every((v, i) => v === value[i]);
  return active === value;
};

export const MissionsScreen: React.FC = () => {
  const navigation                           = useNavigation<Nav>();
  const [activeFilter, setActiveFilter]      = useState<FilterValue>(null);
  const { data: missions, loading, execute } = useApi(missionsApi.getMyMissions);

  useEffect(() => { execute(); }, [execute]);

  const filtered: Mission[] = (missions ?? []).filter((m) => {
    if (!activeFilter) return true;
    if (Array.isArray(activeFilter)) return activeFilter.includes(m.status);
    return m.status === activeFilter;
  });

  const renderItem = useCallback(
    ({ item }: { item: Mission }) => (
      <MissionCard
        mission={item}
        onPress={() => navigation.navigate('MissionDetail', { missionId: item.id })}
      />
    ),
    [navigation],
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes Missions</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('ServicePicker')}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.newBtnText}>Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.chip, isFilterActive(activeFilter, f.value) && styles.chipActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text style={[styles.chipText, isFilterActive(activeFilter, f.value) && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterBar}
      />

      {/* Mission list */}
      {loading && !missions ? (
        <LoadingState message="Chargement des missions…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={execute} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🛡"
              title={activeFilter ? 'Aucune mission' : 'Aucune mission créée'}
              subtitle={
                activeFilter
                  ? 'Aucune mission ne correspond à ce filtre.'
                  : 'Créez votre première mission de sécurité privée.'
              }
              actionLabel={!activeFilter ? 'Créer une mission' : undefined}
              onAction={!activeFilter ? () => navigation.navigate('ServicePicker') : undefined}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[8],
    paddingBottom:     spacing[4],
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.5,
  },
  newBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    backgroundColor:   colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[2] + 1,
    borderRadius:      radius.full,
  },
  newBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    color:      colors.textInverse,
  },
  filterBar: { flexGrow: 0 },
  filters: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[3],
    gap:               spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[2],
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySurface,
    borderColor:     colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
  },
  chipTextActive: { color: colors.primary },
  list: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[10],
    flexGrow:          1,
  },
});
