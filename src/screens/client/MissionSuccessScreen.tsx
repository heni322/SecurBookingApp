/**
 * MissionSuccessScreen — Payment confirmation + mission timeline.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck, Megaphone, Users, Shield, CheckCircle2, Info, ArrowRight } from 'lucide-react-native';
import { Button }  from '@components/ui/Button';
import { Card }    from '@components/ui/Card';
import { colors }  from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionSuccess'>;
type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

export const MissionSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('missions');

  const STEPS: Array<{ Icon: LucideIconComp; label: string; done: boolean; color: string }> = [
    { Icon: ShieldCheck, label: t('success.step_confirmed'),  done: true,  color: colors.success },
    { Icon: Megaphone,   label: t('success.step_published'),  done: false, color: colors.primary },
    { Icon: Users,       label: t('success.step_selection'),  done: false, color: colors.primary },
    { Icon: Shield,      label: t('success.step_operational'),done: false, color: colors.primary },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
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

        {/* Timeline */}
        <Card elevated style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>{t('success.timeline_title')}</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, idx) => {
              const isLast = idx === STEPS.length - 1;
              return (
                <View key={idx} style={styles.stepWrap}>
                  <View style={styles.stepRow}>
                    <View style={styles.dotCol}>
                      <View style={[styles.stepDot, step.done ? { backgroundColor: step.color + '20', borderColor: step.color } : { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

        {/* Info box */}
        <View style={styles.infoBox}>
          <Info size={16} color={colors.info} strokeWidth={2} />
          <Text style={styles.infoText}>{t('success.info')}</Text>
        </View>

        {/* CTA */}
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
  screen:       { flex: 1, backgroundColor: colors.background },
  content:      { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[10], gap: spacing[6] },
  hero:         { alignItems: 'center', gap: spacing[4] },
  glowOuter:    { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(188,147,59,0.06)', borderWidth: 1, borderColor: 'rgba(188,147,59,0.12)', alignItems: 'center', justifyContent: 'center' },
  glowMid:      { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(188,147,59,0.10)', borderWidth: 1, borderColor: 'rgba(188,147,59,0.20)', alignItems: 'center', justifyContent: 'center' },
  checkCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySurface, borderWidth: 1.5, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  title:        { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6, textAlign: 'center' },
  subtitle:     { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  timelineCard: { padding: spacing[5], gap: spacing[4] },
  timelineTitle:{ fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
  timeline:     { gap: 0 },
  stepWrap:     {},
  stepRow:      { flexDirection: 'row', gap: spacing[3] },
  dotCol:       { alignItems: 'center', width: 32 },
  stepDot:      { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  connector:    { width: 2, flex: 1, minHeight: spacing[4], backgroundColor: colors.border, marginVertical: 3 },
  stepTextWrap: { flex: 1, paddingVertical: spacing[2], gap: 3 },
  stepLabel:    { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textMuted },
  stepBadge:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.success, letterSpacing: 0.5 },
  infoBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.infoSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.info + '40' },
  infoText:     { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});
