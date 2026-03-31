/**
 * ServicePickerScreen — sélection du type de prestation avant création de mission.
 * Icônes : lucide-react-native
 */
import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Shield, Building2, Flame, Dog, Car, Star,
  UserCheck, Users, ChevronRight,
} from 'lucide-react-native';
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

type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

const SERVICE_ICON_MAP: Array<{ keywords: string[]; Icon: LucideIconComp; accent: string }> = [
  { keywords: ['luxe', 'hotel', 'vip'],                        Icon: Star,      accent: '#EAB308' },
  { keywords: ['cynophile', 'chien', 'dog'],                   Icon: Dog,       accent: '#10B981' },
  { keywords: ['incendie', 'ssiap', 'feu'],                    Icon: Flame,     accent: '#EF4444' },
  { keywords: ['rondier', 'mobile', 'voiture'],                Icon: Car,       accent: '#3B82F6' },
  { keywords: ['corps', 'apr', 'garde'],                       Icon: UserCheck, accent: '#8B5CF6' },
  { keywords: ['accueil', 'hôtesse', 'hotesse', 'réception'],  Icon: Users,     accent: '#F5A623' },
  { keywords: ['equipe', 'chef', 'coord'],                     Icon: Building2, accent: '#06B6D4' },
];

function getServiceMeta(name: string): { Icon: LucideIconComp; accent: string } {
  const lower = name.toLowerCase();
  const found = SERVICE_ICON_MAP.find(({ keywords }) =>
    keywords.some((k) => lower.includes(k)),
  );
  return found ?? { Icon: Shield, accent: colors.primary };
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
              onPress={() => navigation.navigate('MissionCreate', { serviceTypeId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
};

// ── ServiceCard ───────────────────────────────────────────────────────────────
const ServiceCard: React.FC<{ service: ServiceType; onPress: () => void }> = ({
  service, onPress,
}) => {
  const { Icon, accent } = getServiceMeta(service.name);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: accent + '1A', borderColor: accent + '55' }]}>
        <Icon size={26} color={accent} strokeWidth={1.7} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{service.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{service.description}</Text>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>À partir de</Text>
          <Text style={styles.rateValue}>{formatRate(service.baseRatePerHour)}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors.textMuted} strokeWidth={1.8} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[10],
    gap:               spacing[3],
  },
  listHeader: {
    fontFamily:    fontFamily.body,
    fontSize:      fontSize.sm,
    color:         colors.textMuted,
    marginBottom:  spacing[2],
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
    borderWidth:     1,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  cardBody:  { flex: 1, gap: spacing[1] },
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
  rateLabel: { fontFamily: fontFamily.body,       fontSize: fontSize.xs, color: colors.textMuted },
  rateValue: { fontFamily: fontFamily.monoMedium, fontSize: fontSize.sm, color: colors.primary },
});
