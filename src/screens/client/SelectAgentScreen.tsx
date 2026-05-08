/**
 * SelectAgentScreen — sélection d'un agent pour un booking spécifique.
 *
 * Le client choisit explicitement quel agent doit prendre ce poste, sans
 * attendre que l'agent postule. Affiche tous les agents validés (CNAPS) qui
 * couvrent le service-type demandé, dans le rayon mission, avec :
 *   - distance par rapport au lieu de mission
 *   - flag favori
 *   - flag "disponibilité déclarée pour ce créneau"
 *   - conflits R1-R4 (repos 11h, amplitude 12h, plafond 48h, repos 24h)
 *
 * Les agents non assignables (conflits R1-R4) sont affichés mais grisés.
 *
 * Backend : POST /bookings/:id/assign-agent (avec confirmation utilisateur).
 */
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, ViewStyle,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Star, MapPin, AlertTriangle, CheckCircle2, Calendar,
  Heart, ShieldCheck, Clock, Users, Info,
} from 'lucide-react-native';
import { bookingsApi }      from '@api/endpoints/bookings';
import { useApi }           from '@hooks/useApi';
import { Card }             from '@components/ui/Card';
import { Avatar }           from '@components/ui/Avatar';
import { Badge }            from '@components/ui/Badge';
import { Button }           from '@components/ui/Button';
import { LoadingState }     from '@components/ui/LoadingState';
import { EmptyState }       from '@components/ui/EmptyState';
import { ScreenHeader }     from '@components/ui/ScreenHeader';
import { StarRating }       from '@components/ui/StarRating';
import { Separator }        from '@components/ui/Separator';
import { colors, palette }  from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDistance, formatMissionRange } from '@utils/formatters';
import type { EligibleAgent, MissionStackParamList } from '@models/index';
import { useToast } from '@hooks/useToast';
import { useTranslation } from '@i18n';
import { useConfirmDialogStore } from '@store/confirmDialogStore';

type Props = NativeStackScreenProps<MissionStackParamList, 'SelectAgent'>;

// ─────────────────────────────────────────────────────────────────────────────

export const SelectAgentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const toast = useToast();
  const { t } = useTranslation('missions');
  const confirm = useConfirmDialogStore((s) => s.confirm);

  // Booking detail (for slot info + service type display)
  const {
    data: booking,
    loading: loadingBooking,
    execute: loadBooking,
  } = useApi(bookingsApi.getById);

  // Eligible agents
  const {
    data: agents,
    loading: loadingAgents,
    execute: loadAgents,
    error: agentsError,
  } = useApi(bookingsApi.getEligibleAgents);

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ASSIGNABLE' | 'FAVORITES'>('ASSIGNABLE');

  const refresh = useCallback(() => {
    loadBooking(bookingId);
    loadAgents(bookingId);
  }, [loadBooking, loadAgents, bookingId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filteredAgents = useMemo<EligibleAgent[]>(() => {
    if (!agents) return [];
    switch (filterMode) {
      case 'ASSIGNABLE': return agents.filter(a => a.canBeAssigned);
      case 'FAVORITES':  return agents.filter(a => a.isFavorite);
      default:           return agents;
    }
  }, [agents, filterMode]);

  // ── Counters ────────────────────────────────────────────────────────────
  const counters = useMemo(() => {
    if (!agents) return { all: 0, assignable: 0, favorites: 0 };
    return {
      all:        agents.length,
      assignable: agents.filter(a => a.canBeAssigned).length,
      favorites:  agents.filter(a => a.isFavorite).length,
    };
  }, [agents]);

  // ── Assign action ───────────────────────────────────────────────────────
  const confirmAndAssign = async (agent: EligibleAgent) => {
    if (!agent.canBeAssigned) {
      toast.warning(
        `Cet agent ne peut pas prendre ce poste :\n${agent.schedulingConflicts.join('\n')}`,
        { title: 'Agent non assignable', duration: 6000 },
      );
      return;
    }

    const ok = await confirm({
      title:        t('select_agent.confirm_title'),
      message:      t('select_agent.confirm_body', { name: agent.fullName }),
      confirmLabel: t('select_agent.select_btn'),
    });
    if (!ok) return;
    setAssigningId(agent.id);
    try {
      await bookingsApi.assignAgent(bookingId, { agentId: agent.id });
      toast.success(t('select_agent.success_body', { name: agent.fullName }), { title: t('select_agent.success_title') });
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? t('select_agent.error');
      toast.error(msg, { title: t('select_agent.error') });
    } finally {
      setAssigningId(null);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────
  if (loadingAgents && !agents) {
    return <LoadingState message="Recherche d'agents disponibles…" />;
  }

  if (agentsError && !agents) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Choisir un agent" onBack={() => navigation.goBack()} />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{agentsError}</Text>
          <Button label="Réessayer" onPress={refresh} variant="ghost" />
        </View>
      </View>
    );
  }

  // ── Slot info (for the info banner) ─────────────────────────────────────
  const slotStart = (booking as any)?.slot?.startAt ?? booking?.mission?.startAt;
  const slotEnd   = (booking as any)?.slot?.endAt   ?? booking?.mission?.endAt;
  const showSlotInfo = !!(slotStart && slotEnd);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Choisir un agent" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingAgents || loadingBooking}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Slot info banner ──────────────────────────────────────────── */}
        {showSlotInfo && (
          <View style={styles.slotBanner}>
            <View style={styles.slotBannerRow}>
              <Calendar size={13} color={colors.primary} strokeWidth={2} />
              <Text style={styles.slotBannerText}>
                {formatMissionRange(slotStart!, slotEnd!)}
              </Text>
            </View>
            {booking?.serviceType?.name && (
              <View style={styles.slotBannerRow}>
                <ShieldCheck size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.slotBannerSub}>
                  {booking.serviceType.name}
                  {booking.uniform ? ` · Tenue ${booking.uniform}` : ''}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Filter chips ──────────────────────────────────────────────── */}
        <View style={styles.filterRow}>
          <FilterChip
            label="Disponibles"
            count={counters.assignable}
            active={filterMode === 'ASSIGNABLE'}
            onPress={() => setFilterMode('ASSIGNABLE')}
            Icon={CheckCircle2}
          />
          <FilterChip
            label="Favoris"
            count={counters.favorites}
            active={filterMode === 'FAVORITES'}
            onPress={() => setFilterMode('FAVORITES')}
            Icon={Heart}
          />
          <FilterChip
            label="Tous"
            count={counters.all}
            active={filterMode === 'ALL'}
            onPress={() => setFilterMode('ALL')}
            Icon={Users}
          />
        </View>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {filteredAgents.length === 0 && (
          <EmptyState
            title={
              filterMode === 'FAVORITES'
                ? 'Aucun agent favori'
                : filterMode === 'ASSIGNABLE'
                ? 'Aucun agent disponible'
                : 'Aucun agent éligible'
            }
            subtitle={
              filterMode === 'FAVORITES'
                ? "Ajoutez des agents à vos favoris depuis la fiche détail d'un agent."
                : filterMode === 'ASSIGNABLE'
                ? "Aucun agent ne peut prendre ce poste actuellement (planning, distance ou validation CNAPS)."
                : "Aucun agent validé ne couvre ce service dans le rayon de la mission."
            }
          />
        )}

        {/* ── Agents list ───────────────────────────────────────────────── */}
        {filteredAgents.map(agent => (
          <AgentTile
            key={agent.id}
            agent={agent}
            isAssigning={assigningId === agent.id}
            disabled={assigningId !== null}
            onSelect={() => confirmAndAssign(agent)}
          />
        ))}

        {/* ── Footer info ───────────────────────────────────────────────── */}
        {filteredAgents.length > 0 && (
          <View style={styles.footerInfo}>
            <Info size={12} color={colors.info} strokeWidth={2} />
            <Text style={styles.footerInfoText}>
              Les agents avec un conflit de planning (repos, amplitude, plafond
              hebdomadaire) ne peuvent pas être assignés. Tirez vers le bas pour
              actualiser.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Filter chip ──────────────────────────────────────────────────────────────

interface FilterChipProps {
  label:   string;
  count:   number;
  active:  boolean;
  onPress: () => void;
  Icon:    React.FC<{ size: number; color: string; strokeWidth: number }>;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, count, active, onPress, Icon }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.filterChip, active && styles.filterChipActive]}
  >
    <Icon
      size={13}
      color={active ? colors.primary : colors.textMuted}
      strokeWidth={2}
    />
    <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>
      {label}
    </Text>
    <View style={[styles.filterChipBadge, active && styles.filterChipBadgeActive]}>
      <Text style={[styles.filterChipBadgeText, active && styles.filterChipBadgeTextActive]}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Agent tile ───────────────────────────────────────────────────────────────

interface AgentTileProps {
  agent:       EligibleAgent;
  isAssigning: boolean;
  disabled:    boolean;
  onSelect:    () => void;
}

const AgentTile: React.FC<AgentTileProps> = ({ agent, isAssigning, disabled, onSelect }) => {
  const blocked = !agent.canBeAssigned;

  return (
    <Card style={[styles.agentCard, ...(blocked ? [styles.agentCardBlocked] : [])] as ViewStyle[]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.agentHeader}>
        <Avatar
          fullName={agent.fullName}
          avatarUrl={agent.avatarUrl}
          size="lg"
          online={agent.canBeAssigned}
        />
        <View style={styles.agentInfo}>
          <View style={styles.agentNameRow}>
            <Text style={styles.agentName} numberOfLines={1}>{agent.fullName}</Text>
            {agent.isFavorite && (
              <Heart size={14} color={colors.danger} fill={colors.danger} strokeWidth={2} />
            )}
          </View>

          <View style={styles.ratingRow}>
            <StarRating value={agent.avgRating} size={12} readonly />
            <Text style={styles.ratingText}>
              {agent.avgRating.toFixed(1)} · {agent.completedCount} mission
              {agent.completedCount > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Profile type pill */}
          <View style={styles.pillRow}>
            <Badge
              label={agent.profileType.replace(/_/g, ' ')}
              color={colors.primary}
              bg={colors.primarySurface}
            />
            {agent.isValidated && (
              <Badge label="CNAPS" color={colors.success} bg={colors.successSurface + '22'} />
            )}
          </View>
        </View>
      </View>

      {/* ── Bio (truncated) ─────────────────────────────────────────────── */}
      {agent.bio && (
        <Text style={styles.bioText} numberOfLines={2}>{agent.bio}</Text>
      )}

      {/* ── Meta row: distance + availability ────────────────────────────── */}
      <View style={styles.metaRow}>
        {agent.distanceKm !== undefined && (
          <View style={styles.metaItem}>
            <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaText}>{formatDistance(agent.distanceKm)}</Text>
          </View>
        )}

        <View style={styles.metaItem}>
          <Clock size={11} color={agent.hasDeclaredAvailability ? colors.success : colors.textMuted} strokeWidth={2} />
          <Text style={[
            styles.metaText,
            agent.hasDeclaredAvailability && { color: colors.success },
          ]}>
            {agent.hasDeclaredAvailability ? 'Disponible déclaré' : 'Dispo non déclarée'}
          </Text>
        </View>

        {agent.city && (
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>{agent.city}</Text>
          </View>
        )}
      </View>

      {/* ── Conflicts (if any) ──────────────────────────────────────────── */}
      {blocked && agent.schedulingConflicts.length > 0 && (
        <>
          <Separator marginV={spacing[2]} />
          <View style={styles.conflictWrap}>
            <View style={styles.conflictHeader}>
              <AlertTriangle size={13} color={colors.warning} strokeWidth={2} />
              <Text style={styles.conflictTitle}>Non assignable</Text>
            </View>
            {agent.schedulingConflicts.map((msg, i) => (
              <Text key={i} style={styles.conflictMsg}>• {msg}</Text>
            ))}
          </View>
        </>
      )}

      {/* ── Action button ───────────────────────────────────────────────── */}
      <Button
        label={
          isAssigning
            ? 'Assignation…'
            : blocked
            ? 'Indisponible'
            : 'Choisir cet agent'
        }
        onPress={onSelect}
        fullWidth
        disabled={blocked || disabled}
        rightIcon={
          isAssigning
            ? <ActivityIndicator size="small" color={palette.white} />
            : undefined
        }
        style={styles.selectBtn}
      />
    </Card>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  content:   {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[12],
    gap:               spacing[3],
  },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  errorText: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },

  // Slot banner
  slotBanner: {
    backgroundColor: colors.primarySurface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    padding:         spacing[3],
    gap:             spacing[1] + 2,
  },
  slotBannerRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotBannerText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    color:      colors.primary,
  },
  slotBannerSub: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
  },

  // Filter chips
  filterRow: { flexDirection: 'row', gap: spacing[2] },
  filterChip: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing[1] + 2,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    borderRadius:     radius.full,
    borderWidth:      1,
    borderColor:      colors.border,
    backgroundColor:  colors.surface,
  },
  filterChipActive: {
    borderColor:     colors.borderPrimary,
    backgroundColor: colors.primarySurface,
  },
  filterChipLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
  },
  filterChipLabelActive: { color: colors.primary },
  filterChipBadge: {
    backgroundColor:  colors.surface,
    borderRadius:     radius.full,
    paddingHorizontal: 6,
    paddingVertical:   1,
    minWidth:         18,
    alignItems:       'center',
  },
  filterChipBadgeActive: { backgroundColor: colors.primary },
  filterChipBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   10,
    color:      colors.textMuted,
  },
  filterChipBadgeTextActive: { color: colors.textInverse },

  // Agent card
  agentCard: { gap: spacing[3], padding: spacing[4] },
  agentCardBlocked: { opacity: 0.7 },

  agentHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  agentInfo:   { flex: 1, gap: spacing[1] + 2 },

  agentNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  agentName: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
    flexShrink:    1,
  },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  ratingText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
  },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] + 2, marginTop: 2 },

  bioText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },

  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], rowGap: spacing[2] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  metaText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },

  // Conflicts
  conflictWrap: { gap: spacing[1] + 2 },
  conflictHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  conflictTitle: {
    fontFamily:     fontFamily.bodySemiBold,
    fontSize:       fontSize.xs,
    color:          colors.warning,
    textTransform:  'uppercase',
    letterSpacing:  0.5,
  },
  conflictMsg: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
    paddingLeft: spacing[3],
  },

  selectBtn: { marginTop: spacing[1] },

  // Footer info
  footerInfo: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing[3],
    marginTop: spacing[2],
  },
  footerInfoText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    flex:       1,
    lineHeight: fontSize.xs * 1.5,
  },
});
