/**
 * ServicePickerScreen — sélection du type de prestation avant création de mission.
 * Affiche les ServiceTypes actifs avec tarif horaire et description.
 */
import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { serviceTypesApi } from '@api/endpoints/serviceTypes';
import { useApi }          from '@hooks/useApi';
import { LoadingState }    from '@components/ui/LoadingState';
import { EmptyState }      from '@components/ui/EmptyState';
import { ScreenHeader }    from '@components/ui/ScreenHeader';
import { colors }          from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatRate }      from '@utils/formatters';
import type { ServiceType, MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'ServicePicker'>;

const SERVICE_ICONS: Record<string, string> = {
  default:    '🛡',
  gardiennage:'🏢',
  evenement:  '🎪',
  cynophile:  '🐕',
  ssiap:      '🔥',
  rondier:    '🚗',
  magasin:    '🏪',
};

function getIcon(name: string): string {
  const key = Object.keys(SERVICE_ICONS).find((k) =>
    name.toLowerCase().includes(k),
  );
  return SERVICE_ICONS[key ?? 'default'];
}

export const ServicePickerScreen: React.FC<Props> = ({ navigation }) => {
  const { data: services, loading, execute } = useApi(serviceTypesApi.findAll);

  useEffect(() => { execute(); }, [execute]);

  const active = (services ?? []).filter((s) => s.isActive);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Choisir une prestation"
        subtitle="Sélectionnez le type de sécurité dont vous avez besoin"
        onBack={() => navigation.goBack()}
      />

      {loading && !services ? (
        <LoadingState message="Chargement des prestations…" />
      ) : (
        <FlatList
          data={active}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={execute} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {active.length} prestation{active.length > 1 ? 's' : ''} disponible{active.length > 1 ? 's' : ''}
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="Aucune prestation disponible"
              subtitle="Revenez plus tard ou contactez notre support."
            />
          }
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              onPress={() =>
                navigation.navigate('MissionCreate', { serviceTypeId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
};

// ── ServiceCard ───────────────────────────────────────────────────────────────
const ServiceCard: React.FC<{ service: ServiceType; onPress: () => void }> = ({
  service,
  onPress,
}) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={onPress}>
    <View style={styles.cardIcon}>
      <Text style={styles.cardIconText}>{getIcon(service.name)}</Text>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardName}>{service.name}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>
        {service.description}
      </Text>
      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>À partir de</Text>
        <Text style={styles.rateValue}>{formatRate(service.baseRate)}</Text>
      </View>
    </View>
    <Text style={styles.cardArrow}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[10],
    gap:               spacing[3],
  },
  listHeader: {
    fontFamily:   fontFamily.body,
    fontSize:     fontSize.sm,
    color:        colors.textMuted,
    marginBottom: spacing[2],
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing[4],
    gap:             spacing[4],
  },
  cardIcon: {
    width:           52,
    height:          52,
    borderRadius:    radius.lg,
    backgroundColor: colors.primarySurface,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  cardIconText: { fontSize: 26 },
  cardBody:     { flex: 1, gap: spacing[1] },
  cardName: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
    marginTop:     spacing[1],
  },
  rateLabel: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  rateValue: {
    fontFamily: fontFamily.monoMedium,
    fontSize:   fontSize.sm,
    color:      colors.primary,
  },
  cardArrow: {
    fontSize:   24,
    color:      colors.textMuted,
    flexShrink: 0,
  },
});
