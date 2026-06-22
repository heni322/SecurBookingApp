/**
 * ServicePickerScreen — Service & uniform selection.
 *
 * UX (redesigned):
 *  — Tap a service card to add it (default: 1 agent, STANDARD uniform)
 *  — Stepper +/- adjusts the agent count
 *  — ONE uniform per service line by default (most common case)
 *  — Optional "Personnaliser par agent" link → opens inline per-agent picker
 *  — Sticky bottom CTA shows live summary
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  Shield, Building2, Flame, Dog, Car, Star,
  UserCheck, Check, Plus, Minus, ArrowRight,
  Settings2,
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
import { useTranslation }      from '@i18n';
import i18n from '@i18n';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'ServicePicker'>;
type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

// -- Uniform config ------------------------------------------------------------
export const UNIFORM_OPTIONS = [
  { value: 'STANDARD', emoji: '🦺' },
  { value: 'CIVIL', emoji: '👔' },
  { value: 'EVENEMENTIEL', emoji: '🤵' },
  { value: 'SSIAP', emoji: '🔥' },
  { value: 'CYNOPHILE', emoji: '🐕' },
] as const;

export type UniformValue = (typeof UNIFORM_OPTIONS)[number]['value'];
const DEFAULT_UNIFORM: UniformValue = 'STANDARD';

// -- Data structures -----------------------------------------------------------
interface SelectedLine {
  serviceTypeId:   string;
  name:            string;
  accent:          string;
  ratePerHour:     number;
  agentCount:      number;
  /** Default uniform for all agents (used unless customized). */
  defaultUniform:  UniformValue;
  /** Per-agent overrides — only set when user explicitly customizes. */
  perAgentOverrides: Map<number, UniformValue>;
  /** Whether the per-agent customization panel is open. */
  customizing:     boolean;
}

// -- Icon map ------------------------------------------------------------------
const SERVICE_ICON_MAP: Array<{ keywords: string[]; Icon: LucideIconComp; accent: string }> = [
  { keywords: ['luxe', 'hotel', 'vip'],                       Icon: Star,      accent: palette.goldTxt },
  { keywords: ['cynophile', 'chien', 'dog'],                  Icon: Dog,       accent: palette.txtGreen },
  { keywords: ['incendie', 'ssiap', 'feu'],                   Icon: Flame,     accent: palette.txtRed },
  { keywords: ['rondier', 'mobile', 'voiture'],               Icon: Car,       accent: palette.txtBlue },
  { keywords: ['corps', 'apr', 'garde'],                      Icon: UserCheck, accent: palette.txtPurple },
  { keywords: ['equipe', 'chef', 'coord'],                    Icon: Building2, accent: palette.txtBlue },
];

function getServiceMeta(name: string): { Icon: LucideIconComp; accent: string } {
  const n = name.toLowerCase();
  return SERVICE_ICON_MAP.find(({ keywords }) => keywords.some(k => n.includes(k)))
    ?? { Icon: Shield, accent: palette.txtBlue };
}

/** Expand a SelectedLine into the agentUniforms array expected by the API. */
function getAgentUniforms(line: SelectedLine): UniformValue[] {
  return Array.from({ length: line.agentCount }, (_, i) =>
    line.perAgentOverrides.get(i) ?? line.defaultUniform,
  );
}

// -- Screen --------------------------------------------------------------------
export const ServicePickerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation('services');
  const { data: services, loading, execute } = useApi(serviceTypesApi.findAll);
  const [selected, setSelected] = useState<Map<string, SelectedLine>>(new Map());
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { execute(); }, [execute]);

  // Re-hydrate from MissionCreate if returning via "Edit services"
  useFocusEffect(
    useCallback(() => {
      const existing = (route.params as any)?.existingLines as Array<{
        serviceTypeId: string; agentCount: number; name: string;
        accent: string; agentUniforms: (string | null)[];
      }> | undefined;
      if (!existing?.length) return;
      setSelected(prev => {
        const next = new Map(prev);
        for (const l of existing) {
          if (!next.has(l.serviceTypeId)) {
            const uniforms = l.agentUniforms.map(u => (u as UniformValue) ?? DEFAULT_UNIFORM);
            const allSame  = uniforms.every(u => u === uniforms[0]);
            const overrides = new Map<number, UniformValue>();
            if (!allSame) uniforms.forEach((u, i) => overrides.set(i, u));
            next.set(l.serviceTypeId, {
              serviceTypeId: l.serviceTypeId,
              name:          l.name,
              accent:        l.accent,
              ratePerHour:   0,
              agentCount:    l.agentCount,
              defaultUniform: allSame ? uniforms[0] : DEFAULT_UNIFORM,
              perAgentOverrides: overrides,
              customizing:   !allSame,
            });
          }
        }
        return next;
      });
    }, [route.params]),
  );

  const totalLines  = selected.size;
  const totalAgents = useMemo(
    () => Array.from(selected.values()).reduce((s, l) => s + l.agentCount, 0),
    [selected],
  );

  useEffect(() => {
    Animated.spring(ctaAnim, {
      toValue: totalLines > 0 ? 1 : 0, useNativeDriver: true, friction: 8, tension: 60,
    }).start();
  }, [totalLines, ctaAnim]);

  // -- Mutations ---------------------------------------------------------------
  const toggleService = useCallback((item: any) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        const { accent } = getServiceMeta(item.name);
        next.set(item.id, {
          serviceTypeId:   item.id,
          name:            item.name,
          accent,
          ratePerHour:     item.baseRatePerHour,
          agentCount:      1,
          defaultUniform:  DEFAULT_UNIFORM,
          perAgentOverrides: new Map(),
          customizing:     false,
        });
      }
      return next;
    });
  }, []);

  const changeCount = useCallback((id: string, delta: number) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const newCount = Math.max(1, Math.min(20, line.agentCount + delta));
      if (newCount === line.agentCount) return prev;
      // Trim overrides beyond newCount
      const overrides = new Map(line.perAgentOverrides);
      Array.from(overrides.keys()).filter(k => k >= newCount).forEach(k => overrides.delete(k));
      const next = new Map(prev);
      next.set(id, { ...line, agentCount: newCount, perAgentOverrides: overrides });
      return next;
    });
  }, []);

  const setDefaultUniform = useCallback((id: string, uniform: UniformValue) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const next = new Map(prev);
      // Clearing overrides when picking a new default reduces surprise.
      next.set(id, { ...line, defaultUniform: uniform, perAgentOverrides: new Map() });
      return next;
    });
  }, []);

  const toggleCustomize = useCallback((id: string) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const next = new Map(prev);
      next.set(id, { ...line, customizing: !line.customizing });
      return next;
    });
  }, []);

  const setPerAgentUniform = useCallback((id: string, agentIdx: number, uniform: UniformValue) => {
    setSelected(prev => {
      const line = prev.get(id);
      if (!line) return prev;
      const overrides = new Map(line.perAgentOverrides);
      if (uniform === line.defaultUniform) overrides.delete(agentIdx);
      else overrides.set(agentIdx, uniform);
      const next = new Map(prev);
      next.set(id, { ...line, perAgentOverrides: overrides });
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (totalLines === 0) return;
    const bookingLines = Array.from(selected.values()).map(l => ({
      serviceTypeId: l.serviceTypeId,
      agentCount:    l.agentCount,
      name:          l.name,
      accent:        l.accent,
      agentUniforms: getAgentUniforms(l),
    }));
    navigation.navigate('MissionCreate', { bookingLines });
  }, [selected, totalLines, navigation]);

  const ctaTranslateY = ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('screen_title')}
        subtitle={t('subtitle')}
        onBack={() => navigation.goBack()}
      />

      {totalLines > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {t('summary', { lines: totalLines, agents: totalAgents })}
          </Text>
          <TouchableOpacity onPress={() => setSelected(new Map())} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel={t('clear_all')}>
            <Text style={styles.clearBtnText}>{t('clear_all')}</Text>
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
          ListHeaderComponent={<Text style={styles.listHeader}>{t('available_title')}</Text>}
          ListEmptyComponent={
            <EmptyState Icon={Shield} title={t('empty.title')} subtitle={t('empty.subtitle')} />
          }
          renderItem={({ item }) => {
            const { Icon, accent } = getServiceMeta(item.name);
            const line             = selected.get(item.id);
            return (
              <ServiceCard
                item={item}
                Icon={Icon}
                accent={accent}
                line={line ?? null}
                onToggle={() => toggleService(item)}
                onCountDelta={(d) => changeCount(item.id, d)}
                onSetDefaultUniform={(u) => setDefaultUniform(item.id, u)}
                onToggleCustomize={() => toggleCustomize(item.id)}
                onSetPerAgentUniform={(idx, u) => setPerAgentUniform(item.id, idx, u)}
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
              {t('summary', { lines: totalLines, agents: totalAgents })}
            </Text>
            <Text style={styles.ctaSub} numberOfLines={1}>
              {Array.from(selected.values()).map(l =>
                `${l.agentCount}× ${l.name.split(' ')[0]}`
              ).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleConfirm} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('continue_btn')}>
            <Text style={styles.ctaBtnText}>{t('continue_btn')}</Text>
            <ArrowRight size={18} color={colors.textInverse} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

// -- ServiceCard ---------------------------------------------------------------
interface CardProps {
  item:                 any;
  Icon:                 LucideIconComp;
  accent:               string;
  line:                 SelectedLine | null;
  onToggle:             () => void;
  onCountDelta:         (delta: number) => void;
  onSetDefaultUniform:  (uniform: UniformValue) => void;
  onToggleCustomize:    () => void;
  onSetPerAgentUniform: (agentIdx: number, uniform: UniformValue) => void;
}

const ServiceCard: React.FC<CardProps> = React.memo(({
  item, Icon, accent, line, onToggle, onCountDelta,
  onSetDefaultUniform, onToggleCustomize, onSetPerAgentUniform,
}) => {
  const { t } = useTranslation('services');
  const isSelected = !!line;

  return (
    <View style={[styles.card, isSelected && { borderColor: accent, borderWidth: 1.5 }]}>
      {/* Header row — tap to add/remove */}
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.85} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} accessibilityLabel={item.name}>
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </View>
        )}
        <View style={[styles.cardIconWrap, { backgroundColor: accent + '18' }]}>
          <View style={[styles.cardIcon, { borderColor: accent + '40' }]}>
            <Icon size={24} color={accent} strokeWidth={1.6} />
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={[styles.cardRate, { color: accent }]}>
            {formatEuros(item.baseRatePerHour)}/h · agent
          </Text>
        </View>
        {isSelected ? (
          <View style={[styles.agentCountBadge, { borderColor: accent + '60', backgroundColor: accent + '12' }]}>
            <Text style={[styles.agentCountNum, { color: accent }]}>{line!.agentCount}</Text>
            <Text style={styles.agentCountLabel}>agent{line!.agentCount > 1 ? 's' : ''}</Text>
          </View>
        ) : (
          <View style={[styles.addPill, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
            <Plus size={11} color={accent} strokeWidth={2.5} />
            <Text style={[styles.addPillText, { color: accent }]}>{t('add_btn')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Config panel — visible only when selected */}
      {isSelected && line && (
        <View style={[styles.configPanel, { borderTopColor: accent + '30' }]}>
          {/* Row 1: Agent count stepper */}
          <View style={styles.configRow}>
            <Text style={styles.configRowLabel}>{t('agents_label')}</Text>
            <View style={styles.stepperWrap}>
              <TouchableOpacity
                style={[styles.stepBtn, line.agentCount <= 1 && styles.stepBtnDisabled]}
                onPress={() => onCountDelta(-1)}
                disabled={line.agentCount <= 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Retirer un agent"
                accessibilityState={{ disabled: line.agentCount <= 1 }}
              >
                <Minus size={13} color={line.agentCount <= 1 ? colors.textMuted : accent} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={[styles.stepCount, { color: accent }]}>{line.agentCount}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, line.agentCount >= 20 && styles.stepBtnDisabled]}
                onPress={() => onCountDelta(+1)}
                disabled={line.agentCount >= 20}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={i18n.t('common:add_agent')}
                accessibilityState={{ disabled: line.agentCount >= 20 }}
              >
                <Plus size={13} color={line.agentCount >= 20 ? colors.textMuted : accent} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Default uniform picker */}
          <View style={styles.configBlock}>
            <Text style={styles.configBlockLabel}>{t('uniform_label')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.uniformChipsRow}>
              {UNIFORM_OPTIONS.map(opt => {
                const active = line.defaultUniform === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.uniformChip, active && { backgroundColor: accent + '20', borderColor: accent }]}
                    onPress={() => onSetDefaultUniform(opt.value as UniformValue)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(`uniforms.${opt.value}.label`)}
                  >
                    <Text style={styles.uniformEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.uniformChipText, active && { color: accent, fontFamily: fontFamily.bodySemiBold }]}>
                      {t(`uniforms.${opt.value}.label`)}
                    </Text>
                    {active && (
                      <View style={[styles.uniformCheck, { backgroundColor: accent }]}>
                        <Check size={8} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Optional: customize per agent (opt-in) */}
          {line.agentCount > 1 && (
            <>
              <TouchableOpacity
                style={[styles.customizeToggle, line.customizing && { backgroundColor: accent + '12', borderColor: accent + '60' }]}
                onPress={onToggleCustomize}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ expanded: line.customizing }}
                accessibilityLabel={line.customizing ? t('customize_hide') : t('customize_show')}
              >
                <Settings2 size={13} color={line.customizing ? accent : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.customizeToggleText, line.customizing && { color: accent }]}>
                  {line.customizing ? t('customize_hide') : t('customize_show')}
                </Text>
                {line.perAgentOverrides.size > 0 && !line.customizing && (
                  <View style={[styles.customizeBadge, { backgroundColor: accent }]}>
                    <Text style={styles.customizeBadgeText}>{line.perAgentOverrides.size}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {line.customizing && (
                <View style={styles.perAgentList}>
                  {Array.from({ length: line.agentCount }, (_, idx) => {
                    const current = line.perAgentOverrides.get(idx) ?? line.defaultUniform;
                    return (
                      <View key={idx} style={styles.perAgentRow}>
                        <View style={[styles.agentNumBadge, { backgroundColor: accent + '20', borderColor: accent + '50' }]}>
                          <Text style={[styles.agentNumText, { color: accent }]}>{idx + 1}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.uniformChipsRow}>
                          {UNIFORM_OPTIONS.map(opt => {
                            const active = current === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[styles.uniformChipSmall, active && { backgroundColor: accent + '20', borderColor: accent }]}
                                onPress={() => onSetPerAgentUniform(idx, opt.value as UniformValue)}
                                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={t(`uniforms.${opt.value}.label`)}
                              >
                                <Text style={styles.uniformEmojiSmall}>{opt.emoji}</Text>
                                <Text style={[styles.uniformChipTextSmall, active && { color: accent }]}>
                                  {t(`uniforms.${opt.value}.label`)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
});

// -- Styles --------------------------------------------------------------------
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
    top:             12,
    left:            12,
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

  cardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       spacing[4],
    gap:           spacing[3],
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

  // Config panel
  configPanel: {
    borderTopWidth:    1,
    paddingHorizontal: spacing[4],
    paddingTop:        spacing[3],
    paddingBottom:     spacing[4],
    gap:               spacing[3],
  },
  configRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  configRowLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
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

  configBlock: { gap: spacing[2] },
  configBlockLabel: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color:         colors.textMuted,
  },
  uniformChipsRow: { gap: spacing[2], alignItems: 'center' },
  uniformChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    borderRadius:      radius.full,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
    position:          'relative',
  },
  uniformEmoji:    { fontSize: 15 },
  uniformChipText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary },
  uniformCheck: {
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

  // Per-agent customization
  customizeToggle: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[2],
    paddingVertical:   spacing[2] + 2,
    paddingHorizontal: spacing[3],
    borderRadius:      radius.lg,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  customizeToggleText: { flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
  customizeBadge: {
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    paddingHorizontal: 5,
    alignItems:        'center',
    justifyContent:    'center',
  },
  customizeBadgeText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.textInverse },

  perAgentList: { gap: spacing[2], paddingTop: spacing[1] },
  perAgentRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing[2],
    paddingVertical: spacing[1] + 2,
  },
  agentNumBadge: {
    width:           26,
    height:          26,
    borderRadius:    13,
    borderWidth:     1,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  agentNumText:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs },

  uniformChipSmall: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical:   spacing[1] + 2,
    borderRadius:      radius.full,
    borderWidth:       1,
    borderColor:       colors.border,
    backgroundColor:   colors.surface,
  },
  uniformEmojiSmall:    { fontSize: 12 },
  uniformChipTextSmall: { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textSecondary },

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
    shadowColor:       colors.primary,
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.4,
    shadowRadius:      10,
    elevation:         6,
  },
  ctaBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.textInverse },
});
