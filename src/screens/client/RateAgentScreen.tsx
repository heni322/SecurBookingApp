/**
 * RateAgentScreen — client rates agent after a mission.
 * Step 1: Star score 1–5  |  Step 2: NPS 0–10  |  Step 3: Comment
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView,
  TextInput, TouchableOpacity, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Star, ThumbsUp, ThumbsDown, Minus, CheckCircle2,
} from 'lucide-react-native';
import { useTranslation }   from 'react-i18next';
import { ScreenHeader }     from '@components/ui/ScreenHeader';
import { Button }           from '@components/ui/Button';
import { colors, palette }  from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { ratingsApi }       from '@api/endpoints/ratings';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'RateAgent'>;

const STARS = [1, 2, 3, 4, 5] as const;

const getNpsColors = (s: number): string => {
  if (s >= 9) return colors.success;
  if (s >= 7) return colors.warning;
  return colors.danger;
};

export default function RateAgentScreen({ navigation, route }: Props) {
  const { bookingId, agentId, agentName, missionTitle } = route.params;
  const { t }     = useTranslation('rating');
  const { t: tc } = useTranslation('common');

  const [score,   setScore]   = useState(0);
  const [nps,     setNps]     = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [done,    setDone]    = useState(false);
  const [step,    setStep]    = useState<'rating' | 'nps' | 'comment'>('rating');

  const starAnims = useRef(STARS.map(() => new Animated.Value(1))).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // Resolved once — avoids calling t() inside loops
  const npsScale  = t('nps_scale',   { returnObjects: true }) as string[];
  const starLabels = t('star_labels', { returnObjects: true }) as string[]; // [0] unused
  const quickTags = t('step_comment.tags', { returnObjects: true }) as string[];
  const npsLabels = {
    promoter:  t('nps_categories.promoter'),
    passive:   t('nps_categories.passive'),
    detractor: t('nps_categories.detractor'),
  };

  const getNpsCategory = (s: number) => ({
    label: s >= 9 ? npsLabels.promoter : s >= 7 ? npsLabels.passive : npsLabels.detractor,
    color: getNpsColors(s),
  });

  const fadeIn = () =>
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();

  const handleStarPress = (val: number) => {
    setScore(val);
    Animated.sequence([
      Animated.timing(starAnims[val - 1], { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(starAnims[val - 1],  { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const handleStarNext = () => {
    if (!score) {
      Alert.alert(t('errors.score_required_title'), t('errors.score_required_body'));
      return;
    }
    setStep('nps');
    fadeAnim.setValue(0);
    fadeIn();
  };

  const handleNpsNext = () => {
    if (nps === null) {
      Alert.alert(t('errors.nps_required_title'), t('errors.nps_required_body'));
      return;
    }
    setStep('comment');
    fadeAnim.setValue(0);
    fadeIn();
  };

  const handleSubmit = async () => {
    if (!score) return;
    setBusy(true);
    try {
      await ratingsApi.create({
        bookingId,
        ratedId:   agentId,
        direction: 'CLIENT_TO_AGENT',
        score,
        npsScore:  nps ?? undefined,
        comment:   comment.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      Alert.alert(tc('error'), err?.response?.data?.message ?? t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    const npsCategory = nps !== null ? getNpsCategory(nps) : null;
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('screen_title')} />
        <View style={styles.center}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={48} color={colors.success} strokeWidth={1.5} />
          </View>
          <View style={styles.starsRowDone}>
            {STARS.map(v => (
              <Star key={v} size={28}
                color={v <= score ? palette.gold : colors.border}
                fill={v <= score ? palette.gold : 'transparent'}
                strokeWidth={1.5}
              />
            ))}
          </View>
          {npsCategory && (
            <View style={[styles.npsDoneBadge, { backgroundColor: npsCategory.color + '22', borderColor: npsCategory.color + '80' }]}>
              <Text style={[styles.npsDoneText, { color: npsCategory.color }]}>
                {npsCategory.label} — NPS {nps}/10
              </Text>
            </View>
          )}
          <Text style={styles.doneTitle}>{t('done.title')}</Text>
          <Button
            label={t('done.back_btn')}
            onPress={() => navigation.popToTop()}
            fullWidth size="lg"
            style={styles.doneBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('screen_title')}
        subtitle={missionTitle}
        onBack={() => navigation.goBack()}
      />

      {/* Step dots */}
      <View style={styles.stepBar}>
        {(['rating', 'nps', 'comment'] as const).map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              step === s && styles.stepDotActive,
              i < (['rating', 'nps', 'comment'] as const).indexOf(step) && styles.stepDotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Agent card */}
        <View style={styles.agentCard}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentInitials}>
              {agentName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>{agentName}</Text>
            <Text style={styles.missionLabel} numberOfLines={1}>{missionTitle}</Text>
          </View>
        </View>

        {/* ── STEP 1: Stars ── */}
        {step === 'rating' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('step_rating.title')}</Text>
            <Text style={styles.stepSub}>{t('step_rating.subtitle')}</Text>

            <View style={styles.starsRow}>
              {STARS.map(val => (
                <TouchableOpacity key={val} onPress={() => handleStarPress(val)} activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
                  <Animated.View style={{ transform: [{ scale: starAnims[val - 1] }] }}>
                    <Star size={48}
                      color={val <= score ? palette.gold : colors.border}
                      fill={val <= score ? palette.gold : 'transparent'}
                      strokeWidth={1.5}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>

            {score > 0 && <Text style={styles.scoreLabel}>{starLabels[score]}</Text>}

            <Button
              label={t('nav.continue')}
              onPress={handleStarNext}
              disabled={!score}
              fullWidth size="lg"
              style={styles.ctaBtn}
            />
          </View>
        )}

        {/* ── STEP 2: NPS ── */}
        {step === 'nps' && (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>{t('step_nps.title')}</Text>
            <Text style={styles.stepSub}>{t('step_nps.subtitle')}</Text>

            <View style={styles.npsGrid}>
              {Array.from({ length: 11 }, (_, i) => i).map(n => {
                const color    = getNpsColors(n);
                const isActive = nps === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.npsCell, isActive && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setNps(n)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.npsCellText, isActive && styles.npsCellTextActive]}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.npsLegend}>
              <View style={styles.npsLegendRow}>
                <ThumbsDown size={13} color={colors.danger}  strokeWidth={2} />
                <Text style={[styles.npsLegendText, { color: colors.danger  }]}>{t('step_nps.detractors')}</Text>
              </View>
              <View style={styles.npsLegendRow}>
                <Minus      size={13} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.npsLegendText, { color: colors.warning }]}>{t('step_nps.passives')}</Text>
              </View>
              <View style={styles.npsLegendRow}>
                <ThumbsUp   size={13} color={colors.success} strokeWidth={2} />
                <Text style={[styles.npsLegendText, { color: colors.success }]}>{t('step_nps.promoters')}</Text>
              </View>
            </View>

            {nps !== null && (() => {
              const cat = getNpsCategory(nps);
              return (
                <View style={[styles.npsCategoryBadge, { backgroundColor: cat.color + '20', borderColor: cat.color + '60' }]}>
                  <Text style={[styles.npsCategoryText, { color: cat.color }]}>
                    {cat.label} — {npsScale[nps] || `Score ${nps}`}
                  </Text>
                </View>
              );
            })()}

            <View style={styles.navRow}>
              <Button label={t('nav.back')}     onPress={() => setStep('rating')} variant="ghost" size="md" style={{ flex: 1 }} />
              <Button label={t('nav.continue')} onPress={handleNpsNext} disabled={nps === null} size="md" style={{ flex: 2 }} />
            </View>
          </Animated.View>
        )}

        {/* ── STEP 3: Comment ── */}
        {step === 'comment' && (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>{t('step_comment.title')}</Text>
            <Text style={styles.stepSub}>{t('step_comment.subtitle')}</Text>

            <View style={styles.chips}>
              {quickTags.map(q => {
                const active = comment === q;
                return (
                  <TouchableOpacity
                    key={q}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setComment(active ? '' : q)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{q}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.textarea}
              placeholder={t('step_comment.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.charCount}>{comment.length} / 300</Text>

            <View style={styles.navRow}>
              <Button label={t('nav.back')}  onPress={() => setStep('nps')} variant="ghost" size="md" style={{ flex: 1 }} />
              <Button
                label={busy ? t('nav.sending') : t('nav.submit')}
                onPress={handleSubmit}
                loading={busy}
                size="md"
                style={{ flex: 2 }}
              />
            </View>

            <TouchableOpacity onPress={handleSubmit} style={styles.skipBtn} disabled={busy}>
              <Text style={styles.skipTxt}>{t('step_comment.skip')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4] },

  stepBar:       { flexDirection: 'row', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  stepDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary, width: 24, borderRadius: 4 },
  stepDotDone:   { backgroundColor: colors.success },

  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.screenPaddingH, gap: spacing[3] },
  successIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.successSurface, borderWidth: 2, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  starsRowDone:    { flexDirection: 'row', gap: spacing[2] },
  npsDoneBadge:    { borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderWidth: 1 },
  npsDoneText:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  doneTitle:       { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  doneBtn:         { marginTop: spacing[4] },

  agentCard:     { flexDirection: 'row', alignItems: 'center', gap: spacing[4], backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.border, marginBottom: spacing[5] },
  agentAvatar:   { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  agentInitials: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  agentName:     { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.3 },
  missionLabel:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  stepContent: { gap: spacing[4] },
  stepTitle:   { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  stepSub:     { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },

  starsRow:   { flexDirection: 'row', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  scoreLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: palette.gold, textAlign: 'center' },
  ctaBtn:     { marginTop: spacing[2] },

  npsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'center' },
  npsCell:     { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  npsCellText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textSecondary },
  npsCellTextActive: { color: colors.textInverse },

  npsLegend:        { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[2] },
  npsLegendRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  npsLegendText:    { fontFamily: fontFamily.body, fontSize: fontSize.xs },
  npsCategoryBadge: { alignSelf: 'center', borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderWidth: 1 },
  npsCategoryText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },

  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip:           { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:     { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  chipText:       { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },

  textarea:  { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing[4], fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textPrimary, minHeight: 100 },
  charCount: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right', marginTop: spacing[1] },

  navRow:  { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  skipBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  skipTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
});
