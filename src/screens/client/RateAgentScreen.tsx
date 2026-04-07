/**
 * RateAgentScreen — évaluation agent par le client.
 *
 * Deux niveaux de notation :
 *  1. Score 1–5 étoiles (spec §5.7)
 *  2. NPS score 0–10 (spec §11 — Net Promoter Score)
 *     Promoteurs 9-10 / Passifs 7-8 / Détracteurs 0-6
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
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Button }       from '@components/ui/Button';
import { colors, palette } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { ratingsApi }   from '@api/endpoints/ratings';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'RateAgent'>;

const STARS = [1, 2, 3, 4, 5];
const STAR_LABELS: Record<number, string> = {
  1: 'Insuffisant', 2: 'Passable', 3: 'Bien', 4: 'Très bien', 5: 'Excellent !',
};

const QUICK_COMMENTS = [
  'Ponctuel et professionnel',
  'Excellent travail',
  'Communication parfaite',
  'Je recommande',
  'Très réactif',
  'Travail soigné',
];

// NPS labels per score
const NPS_LABEL: Record<number, string> = {
  0:'Extrêmement improbable', 1:'', 2:'', 3:'', 4:'', 5:'',
  6:'Peu probable', 7:'', 8:'Probable', 9:'Très probable', 10:'Extrêmement probable',
};
const getNpsCategory = (s: number): { label: string; color: string } => {
  if (s >= 9)  return { label: 'Promoteur',   color: colors.success };
  if (s >= 7)  return { label: 'Passif',       color: colors.warning };
  return           { label: 'Détracteur',  color: colors.danger };
};

export default function RateAgentScreen({ navigation, route }: Props) {
  const { bookingId, agentId, agentName, missionTitle } = route.params;

  const [score,    setScore]    = useState(0);
  const [nps,      setNps]      = useState<number | null>(null);
  const [comment,  setComment]  = useState('');
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);
  const [step,     setStep]     = useState<'rating' | 'nps' | 'comment'>('rating');

  const starAnims = useRef(STARS.map(() => new Animated.Value(1))).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const fadeIn = () => Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();

  const handleStarPress = (val: number) => {
    setScore(val);
    Animated.sequence([
      Animated.timing(starAnims[val - 1], { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(starAnims[val - 1],  { toValue: 1, friction: 4,  useNativeDriver: true }),
    ]).start();
  };

  const handleStarNext = () => {
    if (!score) { Alert.alert('Note requise', 'Sélectionnez une note entre 1 et 5.'); return; }
    setStep('nps');
    fadeAnim.setValue(0);
    fadeIn();
  };

  const handleNpsNext = () => {
    if (nps === null) { Alert.alert('NPS requis', 'Sélectionnez votre probabilité de recommandation.'); return; }
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
      Alert.alert('Erreur', err?.response?.data?.message ?? "Impossible d'envoyer la note.");
    } finally {
      setBusy(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (done) {
    const npsCategory = nps !== null ? getNpsCategory(nps) : null;
    return (
      <View style={styles.container}>
        <ScreenHeader title="Évaluation envoyée" />
        <View style={styles.center}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={48} color={colors.success} strokeWidth={1.5} />
          </View>
          <View style={styles.starsRowDone}>
            {STARS.map(v => (
              <Star key={v} size={28} color={v <= score ? palette.amber : colors.border} fill={v <= score ? palette.amber : 'transparent'} strokeWidth={1.5} />
            ))}
          </View>
          {npsCategory && (
            <View style={[styles.npsDoneBadge, { backgroundColor: npsCategory.color + '22', borderColor: npsCategory.color + '80' }]}>
              <Text style={[styles.npsDoneText, { color: npsCategory.color }]}>{npsCategory.label} — NPS {nps}/10</Text>
            </View>
          )}
          <Text style={styles.doneTitle}>Merci pour votre évaluation !</Text>
          <Text style={styles.doneSub}>
            Votre retour contribue à maintenir un haut niveau de qualité sur SecurBook.
          </Text>
          <Button label="Retour à mes missions" onPress={() => navigation.popToTop()} fullWidth size="lg" style={styles.doneBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Évaluer l'agent"
        subtitle={missionTitle}
        onBack={() => navigation.goBack()}
      />

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {(['rating', 'nps', 'comment'] as const).map((s, i) => (
          <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive, i < ['rating','nps','comment'].indexOf(step) && styles.stepDotDone]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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

        {/* ── STEP 1: Star rating ── */}
        {step === 'rating' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Comment s'est passée la mission ?</Text>
            <Text style={styles.stepSub}>Évaluez la qualité globale de la prestation</Text>

            <View style={styles.starsRow}>
              {STARS.map(val => (
                <TouchableOpacity key={val} onPress={() => handleStarPress(val)} activeOpacity={0.7} hitSlop={{ top:12,bottom:12,left:8,right:8 }}>
                  <Animated.View style={{ transform: [{ scale: starAnims[val - 1] }] }}>
                    <Star
                      size={48}
                      color={val <= score ? palette.amber : colors.border}
                      fill={val <= score ? palette.amber : 'transparent'}
                      strokeWidth={1.5}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>

            {score > 0 && (
              <Text style={styles.scoreLabel}>{STAR_LABELS[score]}</Text>
            )}

            <Button
              label="Continuer"
              onPress={handleStarNext}
              disabled={!score}
              fullWidth size="lg"
              style={styles.ctaBtn}
            />
          </View>
        )}

        {/* ── STEP 2: NPS (0–10) ── */}
        {step === 'nps' && (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>Recommanderiez-vous SecurBook ?</Text>
            <Text style={styles.stepSub}>De 0 (pas du tout) à 10 (certainement)</Text>

            <View style={styles.npsGrid}>
              {Array.from({ length: 11 }, (_, i) => i).map(n => {
                const cat      = getNpsCategory(n);
                const isActive = nps === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.npsCell,
                      isActive && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => setNps(n)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.npsCellText, isActive && styles.npsCellTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.npsLegend}>
              <View style={styles.npsLegendRow}>
                <ThumbsDown size={13} color={colors.danger} strokeWidth={2} />
                <Text style={[styles.npsLegendText, { color: colors.danger }]}>Détracteurs 0–6</Text>
              </View>
              <View style={styles.npsLegendRow}>
                <Minus size={13} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.npsLegendText, { color: colors.warning }]}>Passifs 7–8</Text>
              </View>
              <View style={styles.npsLegendRow}>
                <ThumbsUp size={13} color={colors.success} strokeWidth={2} />
                <Text style={[styles.npsLegendText, { color: colors.success }]}>Promoteurs 9–10</Text>
              </View>
            </View>

            {nps !== null && (
              <View style={[styles.npsCategoryBadge, { backgroundColor: getNpsCategory(nps).color + '20', borderColor: getNpsCategory(nps).color + '60' }]}>
                <Text style={[styles.npsCategoryText, { color: getNpsCategory(nps).color }]}>
                  {getNpsCategory(nps).label} — {NPS_LABEL[nps] || `Score ${nps}`}
                </Text>
              </View>
            )}

            <View style={styles.navRow}>
              <Button label="Retour"     onPress={() => setStep('rating')} variant="ghost" size="md" style={{ flex: 1 }} />
              <Button label="Continuer"  onPress={handleNpsNext} disabled={nps === null} size="md" style={{ flex: 2 }} />
            </View>
          </Animated.View>
        )}

        {/* ── STEP 3: Comment ── */}
        {step === 'comment' && (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>Un commentaire ?</Text>
            <Text style={styles.stepSub}>Facultatif — aide les prochains clients</Text>

            <View style={styles.chips}>
              {QUICK_COMMENTS.map(q => {
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
              placeholder="Partagez votre expérience avec cet agent…"
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
              <Button label="Retour"    onPress={() => setStep('nps')} variant="ghost" size="md" style={{ flex: 1 }} />
              <Button
                label={busy ? 'Envoi…' : "Envoyer l'évaluation"}
                onPress={handleSubmit}
                loading={busy}
                size="md"
                style={{ flex: 2 }}
              />
            </View>

            <TouchableOpacity onPress={() => handleSubmit()} style={styles.skipBtn} disabled={busy}>
              <Text style={styles.skipTxt}>Envoyer sans commentaire</Text>
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
  doneSub:         { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSize.sm * 1.6 },
  doneBtn:         { marginTop: spacing[4] },

  agentCard:    { flexDirection: 'row', alignItems: 'center', gap: spacing[4], backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.border, marginBottom: spacing[5] },
  agentAvatar:  { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  agentInitials:{ fontSize: 18, fontWeight: '700', color: '#FFF' },
  agentName:    { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.3 },
  missionLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  stepContent: { gap: spacing[4] },
  stepTitle:   { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  stepSub:     { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },

  starsRow:   { flexDirection: 'row', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  scoreLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: palette.amber, textAlign: 'center' },
  ctaBtn:     { marginTop: spacing[2] },

  npsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'center' },
  npsCell:     { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  npsCellText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textSecondary },
  npsCellTextActive: { color: colors.textInverse },

  npsLegend:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[2] },
  npsLegendRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  npsLegendText: { fontFamily: fontFamily.body, fontSize: fontSize.xs },

  npsCategoryBadge:{ alignSelf: 'center', borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderWidth: 1 },
  npsCategoryText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },

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
