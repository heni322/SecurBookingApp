/**
 * MissionSuccessScreen - Payment confirmation + mission timeline.
 *
 * FIX #3: Poll GET /missions/:id after payment so we only show the success
 * hero once the backend has set the mission to CONFIRMED or PUBLISHED.
 * If the webhook has not arrived yet we show a "pending confirmation" state
 * with a spinner, retrying every 3 s for up to 30 s before falling back to
 * a neutral message (SEPA takes 1-3 days -- that is expected).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ShieldCheck, Megaphone, Users, Shield,
  CheckCircle2, Info, ArrowRight, Clock,
} from 'lucide-react-native';
import { Button }        from '@components/ui/Button';
import { Card }          from '@components/ui/Card';
import { missionsApi }   from '@api/endpoints/missions';
import { colors }        from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { MissionStatus } from '@constants/enums';
import type { MissionStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionSuccess'>;
type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

// After payment is confirmed, backend sets mission to STAFFED then admin publishes
// Poll until we see any of these statuses to confirm payment was received
const CONFIRMED_STATUSES = new Set([
  MissionStatus.STAFFED,
  MissionStatus.PUBLISHED,
  MissionStatus.STAFFING,
  MissionStatus.IN_PROGRESS,
  MissionStatus.COMPLETED,
]);

const POLL_INTERVAL_MS  = 3_000;
const POLL_MAX_ATTEMPTS = 10;

export const MissionSuccessScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }         = useTranslation('missions');
  const { missionId } = route.params;

  type VerifyState = 'pending' | 'confirmed' | 'timeout';
  const [verifyState, setVerifyState] = useState<VerifyState>('pending');
  const attempts = useRef(0);
  const timer    = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const { data: res } = await missionsApi.getById(missionId);
      const mission = (res as any).data ?? res;
      if (CONFIRMED_STATUSES.has(mission.status)) {
        if (timer.current) clearInterval(timer.current);
        setVerifyState('confirmed');
        return;
      }
    } catch { /* network error - keep polling */ }
    attempts.current += 1;
    if (attempts.current >= POLL_MAX_ATTEMPTS) {
      if (timer.current) clearInterval(timer.current);
      setVerifyState('timeout');
    }
  }, [missionId]);

  useEffect(() => {
    checkStatus();
    timer.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [checkStatus]);

  // Timeline steps matching real flow: STAFFED (payment) → PUBLISHED → STAFFING → IN_PROGRESS
  const STEPS: Array<{ Icon: LucideIconComp; label: string; done: boolean; color: string }> = [
    { Icon: ShieldCheck, label: t('success.step_confirmed'),   done: verifyState !== 'pending', color: colors.success },
    { Icon: Megaphone,   label: t('success.step_published'),   done: false, color: colors.primary },
    { Icon: Users,       label: t('success.step_selection'),   done: false, color: colors.primary },
    { Icon: Shield,      label: t('success.step_operational'), done: false, color: colors.primary },
  ];

  if (verifyState === 'pending') {
    return (
      <View style={styles.screen}>
        <View style={styles.pendingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.pendingTitle}>Confirmation en cours...</Text>
          <Text style={styles.pendingSubtitle}>
            Nous verifions la reception du paiement. Cela prend generalement quelques secondes.
          </Text>
        </View>
      </View>
    );
  }

  if (verifyState === 'timeout') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.glowOuter, { borderColor: colors.primaryGlow }]}>
              <View style={[styles.glowMid, { borderColor: 'rgba(96,165,250,0.35)' }]}>
                <View style={[styles.checkCircle, { borderColor: colors.info }]}>
                  <Clock size={44} color={colors.info} strokeWidth={1.6} />
                </View>
              </View>
            </View>
            <Text style={styles.title}>Paiement en cours de traitement</Text>
            <Text style={styles.subtitle}>
              Pour les paiements SEPA, la confirmation peut prendre 1 a 2 jours ouvres.
              Vous recevrez une notification des que votre mission sera confirmee.
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Info size={16} color={colors.info} strokeWidth={2} />
            <Text style={styles.infoText}>
              Votre mission sera publiee automatiquement aux agents des reception du paiement.
              Aucune action supplementaire n'est requise.
            </Text>
          </View>
          <Button
            label="Suivre ma mission"
            onPress={() => navigation.replace('MissionDetail', { missionId })}
            fullWidth size="lg"
            rightIcon={<ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />}
          />
          <Button
            label="Retour a l'accueil"
            onPress={() => navigation.popToTop()}
            fullWidth variant="ghost" size="md"
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.glowOuter}>
            <View style={styles.glowMid}>
              <View style={styles.checkCircle}>
                <CheckCircle2 size={44} color={colors.primary} strokeWidth={1.6} />
              </View>
            </View>
          </View>
          <Text style={styles.title}>{t('success.title')}</Text>
          <Text style={styles.subtitle}>{t('success.subtitle')}</Text>
        </View>
        <Card elevated style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>{t('success.timeline_title')}</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, idx) => {
              const isLast = idx === STEPS.length - 1;
              return (
                <View key={idx} style={styles.stepWrap}>
                  <View style={styles.stepRow}>
                    <View style={styles.dotCol}>
                      <View style={[
                        styles.stepDot,
                        step.done
                          ? { backgroundColor: step.color + '20', borderColor: step.color }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}>
                        {step.done
                          ? <step.Icon size={16} color={step.color}       strokeWidth={1.8} />
                          : <step.Icon size={16} color={colors.textMuted} strokeWidth={1.8} />
                        }
                      </View>
                      {!isLast && <View style={[styles.connector, step.done && { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={styles.stepTextWrap}>
                      <Text style={[styles.stepLabel, step.done && { color: colors.textPrimary, fontFamily: fontFamily.bodyMedium }]}>
                        {step.label}
                      </Text>
                      {step.done && <Text style={styles.stepBadge}>{t('success.step_done')}</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
        <View style={styles.infoBox}>
          <Info size={16} color={colors.info} strokeWidth={2} />
          <Text style={styles.infoText}>{t('success.info')}</Text>
        </View>
        <Button
          label={t('success.home')}
          onPress={() => navigation.popToTop()}
          fullWidth size="lg"
          rightIcon={<ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: colors.background },
  content:         { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[10], gap: spacing[6] },
  pendingWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.screenPaddingH, gap: spacing[5] },
  pendingTitle:    { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.4 },
  pendingSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  hero:            { alignItems: 'center', gap: spacing[4] },
  glowOuter:       { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  glowMid:         { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(188,147,59,0.10)', borderWidth: 1, borderColor: 'rgba(188,147,59,0.20)', alignItems: 'center', justifyContent: 'center' },
  checkCircle:     { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySurface, borderWidth: 1.5, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  title:           { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6, textAlign: 'center' },
  subtitle:        { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  timelineCard:    { padding: spacing[5], gap: spacing[4] },
  timelineTitle:   { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
  timeline:        { gap: 0 },
  stepWrap:        {},
  stepRow:         { flexDirection: 'row', gap: spacing[3] },
  dotCol:          { alignItems: 'center', width: 32 },
  stepDot:         { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  connector:       { width: 2, flex: 1, minHeight: spacing[4], backgroundColor: colors.border, marginVertical: 3 },
  stepTextWrap:    { flex: 1, paddingVertical: spacing[2], gap: 3 },
  stepLabel:       { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textMuted },
  stepBadge:       { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.success, letterSpacing: 0.5 },
  infoBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.infoSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.info + '40' },
  infoText:        { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});

