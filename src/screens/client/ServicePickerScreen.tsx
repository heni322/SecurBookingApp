/**
 * ServicePickerScreen — Multi-service selection with per-agent uniform picker.
 *
 * UX:
 *  • Tap a card to select/deselect a service
 *  • +/- stepper adds/removes agent slots (each agent = one uniform chip)
 *  • Each agent has its own tenue (STANDARD, CIVIL, EVENEMENTIEL, SSIAP, CYNOPHILE)
 *  • Sticky bottom bar shows live summary + "Continuer" CTA
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Shield, Building2, Flame, Dog, Car, Star,
  UserCheck, Users, Check, Plus, Minus, ArrowRight,
  ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { serviceTypesApi }     from '@api/endpoints/serviceTypes';
import { useApi }              from '@hooks/useApi';
import { EmptyState }          from '@components/ui/EmptyState';
import { ScreenHeader }        from '@components/ui/ScreenHeader';
import { MissionListSkeleton } from '@components/ui/SkeletonLoader';
import { colors, palette }     from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros }         from '@utils/formatters';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'ServicePicker'>;
type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

// ── Uniform config ────────────────────────────────────────────────────────────
export const UNIFORM_OPTIONS = [
  { value: 'STANDARD',     label: 'Standard',  desc: 'Uniforme noir réglementaire', emoji: '🦺' },
  { value: 'CIVIL',        label: 'Civil',      desc: 'Tenue discrète, en civil',    emoji: '👔' },
  { value: 'EVENEMENTIEL', label: 'Soirée',     desc: 'Costume / tenue de gala',     emoji: '🤵' },
  { value: 'SSIAP',        label: 'SSIAP',      desc: 'Tenue incendie réglementaire',emoji: '🔥' },
  { value: 'CYNOPHILE',    label: 'Cynophile',  desc: 'Tenue maître-chien',          emoji: '🐕' },
] as const;

export type UniformValue = (typeof UNIFORM_OPTIONS)[number]['value'];

// ── Data structures ───────────────────────────────────────────────────────────
interface AgentSlot { uniform: UniformValue }

interface SelectedLine {
  serviceTypeId: string;
  name:          string;
  accent:        string;
  ratePerHour:   number;
  agents:        AgentSlot[];   // one slot per agent, each with own uniform
  expanded:      boolean;       // show/hide per-agent detail
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const SERVICE_ICON_MAP: Array<{ keywords: string[]; Icon: LucideIconComp; accent: string }> = [
  { keywords: ['luxe', 'hotel', 'vip'],                       Icon: Star,      accent: '#bc933b' },
  { keywords: ['cynophile', 'chien', 'dog'],                  Icon: Dog,       accent: '#10B981' },
  { keywords: ['incendie', 'ssiap', 'feu'],                   Icon: Flame,     accent: '#EF4444' },
  { keywords: ['rondier', 'mobile', 'voiture'],               Icon: Car,       accent: '#3B82F6' },
  { keywords: ['corps', 'apr', 'garde'],                      Icon: UserCheck, accent: '#8B5CF6' },
  { keywords: ['accueil', 'hôtesse', 'hotesse', 'réception'], Icon: Users,     accent: '#bc933b' },
  { keywords: ['equipe', 'chef', 'coord'],                    Icon: Building2, accent: '#06B6D4' },
];
function getServiceMeta(name: string): { Icon: LucideIconComp; accent: string } {
  const n = name.toLowerCase();
  return SERVICE_ICON_MAP.find(({ keywords }) => keywords.some(k => n.includes(k)))
    ?? { Icon: Shield, accent: colors.primary };
}

const defaultSlot = (): AgentSlot => ({ uniform: 'STANDARD' });

// ── Screen ────────────────────────────────────────────────────────────────────
export const ServicePickerScreen: React.FC<Props> = ({ navigation }) => {
  const { data: services, loading, execute } = useApi(serviceTypesApi.findAll);
  const [selected, setSelected] = useState<Map<string, SelectedLine>>(new Map());
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { execute(); }, [execute]);

  const totalLines  = selected.size;
  const totalAgents = useMemo(
    () => Array.from(selected.values()).reduce((s, l) => s + l.agents.length, 0),
    [selected],
  );

  useEffect(() => {
    Animated.spring(ctaAnim, {
      toValue: totalLines > 0 ? 1 : 0, useNativeDriver: true, friction: 8, tension: 60,
    }).start();
  }, [totalLines]);

  // Toggle service selection
  const toggleService = useCallback((item: any) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        const { accent } = getServiceMeta(item.name);
        next.set(item.id, {
          serviceTypeId: item.id,
          name:          item.name,
          accent,
          ratePerHour:   item.baseRatePerHour,
          agents:        [defaultSlot()],
          expanded:      true,
        });
      }
      return next;
    });
  }, []);

  // Add one agent slot
  const addAgent = useCallback((id: string) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line || line.agents.length >= 20) return prev;
      const next = new Map(prev);
      next.set(id, { ...line, agents: [...line.agents, defaultSlot()], expanded: true });
      return next;
    });
  }, []);

  // Remove last agent slot
  const removeAgent = useCallback((id: string) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line || line.agents.length <= 1) return prev;
      const next = new Map(prev);
      next.set(id, { ...line, agents: line.agents.slice(0, -1) });
      return next;
    });
  }, []);

  // Change uniform for a specific agent index
  const setAgentUniform = useCallback((id: string, agentIdx: number, uniform: UniformValue) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const agents = line.agents.map((a, i) => i === agentIdx ? { ...a, uniform } : a);
      const next   = new Map(prev);
      next.set(id, { ...line, agents });
      return next;
    });
  }, []);

  // Set ALL agents of a line to same uniform (quick shortcut)
  const setAllUniforms = useCallback((id: string, uniform: UniformValue) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const next = new Map(prev);
      next.set(id, { ...line, agents: line.agents.map(() => ({ uniform })) });
      return next;
    });
  }, []);

  // Toggle expand/collapse per-agent detail
  const toggleExpand = useCallback((id: string) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const next = new Map(prev);
      next.set(id, { ...line, expanded: !line.expanded });
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (totalLines === 0) return;
    const bookingLines = Array.from(selected.values()).map(l => ({
      serviceTypeId: l.serviceTypeId,
      agentCount:    l.agents.length,
      name:          l.name,
      accent:        l.accent,
      agentUniforms: l.agents.map(a => a.uniform),
    }));
    navigation.navigate('MissionCreate', { bookingLines });
  }, [selected, totalLines, navigation]);

  const ctaTranslateY = ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Prestations"
        subtitle="Sélectionnez un ou plusieurs services"
        onBack={() => navigation.goBack()}
      />

      {/* Selection summary bar */}
      {totalLines > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {totalLines} prestation{totalLines > 1 ? 's' : ''} · {totalAgents} agent{totalAgents > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => setSelected(new Map())} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Tout effacer</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !services ? (
        <View style={styles.skeletonWrap}><MissionListSkeleton count={4} /></View>
      ) : (
        <FlatList
          data={(services as any[]) ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, totalLines > 0 && styles.listWithCta]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={execute} tintColor={colors.primary} />}
          ListHeaderComponent={<Text style={styles.listHeader}>PRESTATIONS DISPONIBLES</Text>}
          ListEmptyComponent={
            <EmptyState Icon={Shield} title="Aucun service disponible" subtitle="Revenez plus tard." />
          }
          renderItem={({ item }) => {
            const { Icon, accent } = getServiceMeta(item.name);
            const line             = selected.get(item.id);
            const isSelected       = !!line;
            return (
              <ServiceCard
                item={item}
                Icon={Icon}
                accent={accent}
                isSelected={isSelected}
                line={line ?? null}
                onToggle={() => toggleService(item)}
                onAddAgent={() => addAgent(item.id)}
                onRemoveAgent={() => removeAgent(item.id)}
                onSetAgentUniform={(idx, u) => setAgentUniform(item.id, idx, u)}
                onSetAllUniforms={(u) => setAllUniforms(item.id, u)}
                onToggleExpand={() => toggleExpand(item.id)}
              />
            );
          }}
        />
      )}

      {/* Sticky CTA */}
      <Animated.View
        style={[styles.ctaWrap, { transform: [{ translateY: ctaTranslateY }] }]}
        pointerEvents={totalLines > 0 ? 'auto' : 'none'}
      >
        <View style={styles.ctaInner}>
          <View style={styles.ctaInfo}>
            <Text style={styles.ctaTitle}>
              {totalLines} prestation{totalLines > 1 ? 's' : ''} · {totalAgents} agent{totalAgents > 1 ? 's' : ''}
            </Text>
            <Text style={styles.ctaSub} numberOfLines={1}>
              {Array.from(selected.values()).map(l =>
                `${l.agents.length}× ${l.name.split(' ')[0]}`
              ).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
            <ArrowRight size={18} color={colors.textInverse} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

// ── ServiceCard ───────────────────────────────────────────────────────────────
interface CardProps {
  item:               any;
  Icon:               LucideIconComp;
  accent:             string;
  isSelected:         boolean;
  line:               SelectedLine | null;
  onToggle:           () => void;
  onAddAgent:         () => void;
  onRemoveAgent:      () => void;
  onSetAgentUniform:  (agentIdx: number, uniform: UniformValue) => void;
  onSetAllUniforms:   (uniform: UniformValue) => void;
  onToggleExpand:     () => void;
}

const ServiceCard: React.FC<CardProps> = React.memo(({
  item, Icon, accent, isSelected, line,
  onToggle, onAddAgent, onRemoveAgent,
  onSetAgentUniform, onSetAllUniforms, onToggleExpand,
}) => (
  <View style={[styles.card, isSelected && { borderColor: accent, borderWidth: 1.5 }]}>

    {/* ── Header row — always visible ──────────────────────────────── */}
    <TouchableOpacity
      style={styles.cardHeader}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {/* Check badge */}
      {isSelected && (
        <View style={[styles.checkBadge, { backgroundColor: accent }]}>
          <Check size={10} color="#fff" strokeWidth={3} />
        </View>
      )}

      {/* Icon */}
      <View style={[styles.cardIconWrap, { backgroundColor: accent + '18' }]}>
        <View style={[styles.cardIcon, { borderColor: accent + '40' }]}>
          <Icon size={24} color={accent} strokeWidth={1.6} />
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={[styles.cardRate, { color: accent }]}>{formatEuros(item.baseRatePerHour)}/h · agent</Text>
      </View>

      {/* Right: add button or agent count badge */}
      {isSelected ? (
        <View style={[styles.agentCountBadge, { borderColor: accent + '60', backgroundColor: accent + '12' }]}>
          <Text style={[styles.agentCountNum, { color: accent }]}>{line!.agents.length}</Text>
          <Text style={styles.agentCountLabel}>agent{line!.agents.length > 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <View style={[styles.addPill, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
          <Plus size={11} color={accent} strokeWidth={2.5} />
          <Text style={[styles.addPillText, { color: accent }]}>Ajouter</Text>
        </View>
      )}
    </TouchableOpacity>

    {/* ── Per-agent detail — visible when selected ─────────────────── */}
    {isSelected && line && (
      <View style={[styles.agentsPanel, { borderTopColor: accent + '30' }]}>

        {/* Agent count controls */}
        <View style={styles.agentCountRow}>
          <Text style={styles.agentCountTitle}>Agents & tenues</Text>
          <View style={styles.agentStepper}>
            <TouchableOpacity
              style={[styles.stepBtn, line.agents.length <= 1 && styles.stepBtnDisabled]}
              onPress={onRemoveAgent}
              disabled={line.agents.length <= 1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Minus size={13} color={line.agents.length <= 1 ? colors.textMuted : accent} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.stepCount, { color: accent }]}>{line.agents.length}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, line.agents.length >= 20 && styles.stepBtnDisabled]}
              onPress={onAddAgent}
              disabled={line.agents.length >= 20}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={13} color={line.agents.length >= 20 ? colors.textMuted : accent} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick "same tenue for all" shortcut */}
        {line.agents.length > 1 && (
          <View style={styles.allSameRow}>
            <Text style={styles.allSameLabel}>Même tenue pour tous :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.allSameChips}>
              {UNIFORM_OPTIONS.map(opt => {
                const allSame = line.agents.every(a => a.uniform === opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.uniformChip, allSame && { backgroundColor: accent + '20', borderColor: accent }]}
                    onPress={() => onSetAllUniforms(opt.value as UniformValue)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.uniformEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.uniformChipText, allSame && { color: accent }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Expand/collapse per-agent rows */}
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={onToggleExpand}
          activeOpacity={0.7}
        >
          <Text style={[styles.expandToggleText, { color: accent }]}>
            {line.expanded ? 'Masquer le détail' : 'Configurer chaque agent'}
          </Text>
          {line.expanded
            ? <ChevronUp size={14} color={accent} strokeWidth={2} />
            : <ChevronDown size={14} color={accent} strokeWidth={2} />
          }
        </TouchableOpacity>

        {/* Per-agent rows */}
        {line.expanded && line.agents.map((agent, idx) => (
          <AgentRow
            key={idx}
            index={idx}
            agent={agent}
            accent={accent}
            onChangeUniform={(u) => onSetAgentUniform(idx, u)}
          />
        ))}
      </View>
    )}
  </View>
));

// ── AgentRow ──────────────────────────────────────────────────────────────────
const AgentRow: React.FC<{
  index:           number;
  agent:           AgentSlot;
  accent:          string;
  onChangeUniform: (u: UniformValue) => void;
}> = ({ index, agent, accent, onChangeUniform }) => (
  <View style={agentRowStyles.wrap}>
    {/* Agent number */}
    <View style={[agentRowStyles.badge, { backgroundColor: accent + '20', borderColor: accent + '50' }]}>
      <Text style={[agentRowStyles.badgeNum, { color: accent }]}>{index + 1}</Text>
    </View>

    {/* Uniform chips */}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={agentRowStyles.chipsRow}
    >
      {UNIFORM_OPTIONS.map(opt => {
        const active = agent.uniform === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              agentRowStyles.chip,
              active && { backgroundColor: accent + '20', borderColor: accent },
            ]}
            onPress={() => onChangeUniform(opt.value as UniformValue)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Text style={agentRowStyles.chipEmoji}>{opt.emoji}</Text>
            <View>
              <Text style={[agentRowStyles.chipLabel, active && { color: accent }]}>{opt.label}</Text>
              {active && (
                <Text style={[agentRowStyles.chipDesc, { color: accent }]} numberOfLines={1}>
                  {opt.desc}
                </Text>
              )}
            </View>
            {active && (
              <View style={[agentRowStyles.checkDot, { backgroundColor: accent }]}>
                <Check size={8} color="#fff" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const agentRowStyles = StyleSheet.create({
  wrap: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  badge: {
    width:          26,
    height:         26,
    borderRadius:   13,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginTop:      spacing[1],
  },
  badgeNum: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs },
  chipsRow: { gap: spacing[2], alignItems: 'center' },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    borderRadius:      radius.xl,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
    position:          'relative',
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
  },
  chipDesc: {
    fontFamily: fontFamily.body,
    fontSize:   9,
    lineHeight: 12,
    maxWidth:   80,
  },
  checkDot: {
    position:        'absolute',
    top:             -4,
    right:           -4,
    width:           14,
    height:          14,
    borderRadius:    7,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     colors.background,
  },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  skeletonWrap: { padding: layout.screenPaddingH },

  summaryBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[2] + 2,
    backgroundColor:   colors.primarySurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  summaryText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  clearBtn:    { paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  clearBtnText:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.danger },

  listHeader: {
    fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted,
    letterSpacing: 1.2, marginBottom: spacing[3],
  },
  list:        { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12], gap: spacing[3] },
  listWithCta: { paddingBottom: 140 },

  // Card shell
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius['2xl'],
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.18,
    shadowRadius:    8,
    elevation:       3,
  },
  checkBadge: {
    position:        'absolute',
    top:             -6,
    left:            -6,
    zIndex:          10,
    width:           20,
    height:          20,
    borderRadius:    10,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     colors.background,
    elevation:       4,
  },

  // Card header
  cardHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         spacing[4],
    gap:             spacing[3],
  },
  cardIconWrap: {
    width:          60,
    height:         60,
    borderRadius:   radius.xl,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  cardIcon: {
    width:          46,
    height:         46,
    borderRadius:   radius.lg,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor:'transparent',
  },
  cardInfo:  { flex: 1, gap: 3 },
  cardName:  { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  cardDesc:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  cardRate:  { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, marginTop: 2 },

  agentCountBadge: {
    alignItems:        'center',
    minWidth:          44,
    paddingHorizontal: spacing[2],
    paddingVertical:   spacing[2],
    borderRadius:      radius.xl,
    borderWidth:       1,
    flexShrink:        0,
  },
  agentCountNum:   { fontFamily: fontFamily.display, fontSize: fontSize.xl, lineHeight: fontSize.xl * 1.1 },
  agentCountLabel: { fontFamily: fontFamily.body, fontSize: 9, color: colors.textMuted, lineHeight: 11 },

  addPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    borderRadius:      radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    borderWidth:       1,
  },
  addPillText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs },

  // Agents panel
  agentsPanel: {
    borderTopWidth: 1,
    paddingHorizontal: spacing[4],
    paddingBottom:  spacing[4],
    paddingTop:     spacing[3],
    gap:            spacing[3],
  },
  agentCountRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  agentCountTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary },
  agentStepper: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[3],
  },
  stepBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepCount: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize.xl,
    minWidth:   24,
    textAlign:  'center',
  },

  // All-same shortcut
  allSameRow: { gap: spacing[2] },
  allSameLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  allSameChips: { gap: spacing[2] },
  uniformChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1] + 2,
    borderRadius:      radius.full,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  uniformEmoji:    { fontSize: 13 },
  uniformChipText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },

  // Expand toggle
  expandToggle: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing[1] + 2,
    paddingVertical: spacing[2],
    borderRadius:   radius.lg,
    borderWidth:    1,
    borderColor:    colors.border,
    backgroundColor: colors.surface,
  },
  expandToggleText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },

  // Sticky CTA
  ctaWrap: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    paddingBottom:     spacing[8],
    paddingTop:        spacing[3],
    paddingHorizontal: layout.screenPaddingH,
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: -4 },
    shadowOpacity:     0.2,
    shadowRadius:      12,
    elevation:         12,
  },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  ctaInfo:  { flex: 1, gap: 2 },
  ctaTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.textPrimary },
  ctaSub:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  ctaBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[2],
    backgroundColor:   colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical:   spacing[3] + 2,
    borderRadius:      radius.full,
    shadowColor:       '#bc933b',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.4,
    shadowRadius:      10,
    elevation:         6,
  },
  ctaBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.textInverse },
});
