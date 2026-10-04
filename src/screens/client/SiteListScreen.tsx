/**
 * SiteListScreen — Mes sites (lot 3, audit 2026-08).
 *
 * ── Pourquoi un référentiel de sites ────────────────────────────────────────
 * Avant ce lot, les consignes vivaient dans `Mission.notes` : un champ texte de
 * 1000 caractères, ressaisi à chaque mission, dans lequel il fallait faire
 * tenir accès, clés, codes, contacts et astreintes. Un client qui commande
 * douze vacations par mois sur le même bâtiment les ressaisissait douze fois.
 *
 * Le site est donc rattaché au CLIENT, pas à la mission — et une rotation de
 * code se fait en un seul endroit.
 */
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTranslation } from '@i18n';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, ChevronRight, Plus, KeyRound, Users, MapPin } from 'lucide-react-native';

import { sitesApi } from '@api/endpoints/sites';
import type { Site } from '@api/endpoints/sites';
import { qk } from '@api/queryKeys';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { EmptyState } from '@components/ui/EmptyState';
import { LoadingState } from '@components/ui/LoadingState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { useAuthStore } from '@store/authStore';
import { colors } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SiteList'>;

export default function SiteListScreen({ navigation }: Props) {
  const { t } = useTranslation('sites');
  const clientId = useAuthStore(s => s.user?.clientId);

  const query = useQuery({
    queryKey: qk.sites.byClient(clientId ?? ''),
    queryFn: async () => (await sitesApi.listForClient(clientId!)).data.data,
    enabled: !!clientId,
  });

  // Revenir de l'édition doit montrer les modifications immédiatement.
  useFocusEffect(useCallback(() => { query.refetch(); }, [query.refetch]));

  const renderItem = ({ item }: { item: Site }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('SiteDetail', { siteId: item.id })}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 size={16} color={colors.primary} strokeWidth={2} />
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.8} />
        </View>

        <View style={styles.addressRow}>
          <MapPin size={12} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={styles.address} numberOfLines={1}>
            {item.address}, {item.zipCode} {item.city}
          </Text>
        </View>

        {/* Compteurs : ils disent d'un coup d'œil si un site est réellement
            renseigné ou si sa fiche est restée vide. */}
        <View style={styles.countsRow}>
          <View style={styles.countChip}>
            <Users size={11} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.countText}>
              {t('counts.posts', { count: item._count?.posts ?? 0 })}
            </Text>
          </View>
          <View style={styles.countChip}>
            <Users size={11} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.countText}>
              {t('counts.contacts', { count: item._count?.contacts ?? 0 })}
            </Text>
          </View>
          <View style={styles.countChip}>
            <KeyRound size={11} color={colors.warning} strokeWidth={1.8} />
            <Text style={styles.countText}>
              {t('counts.secrets', { count: item._count?.secrets ?? 0 })}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (query.isLoading) return <LoadingState message={t('loading')} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('title')}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={query.data ?? []}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={query.refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={t('empty.title')}
            subtitle={t('empty.message')}
          />
        }
        ListFooterComponent={
          <Button
            label={t('add')}
            onPress={() => navigation.navigate('SiteDetail', {})}
            fullWidth
            size="lg"
            style={styles.addBtn}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: layout.screenPaddingH, paddingBottom: spacing[10], gap: spacing[3] },

  card: { gap: spacing[2] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  label: {
    flex: 1, fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base, color: colors.textPrimary,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  address: {
    flex: 1, fontFamily: fontFamily.body,
    fontSize: fontSize.xs, color: colors.textMuted,
  },

  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  countChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 3, paddingHorizontal: spacing[2],
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  countText: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary,
  },

  addBtn: { marginTop: spacing[4] },
});
