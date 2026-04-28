/**
 * SelectAgentScreen — Deprecated: agent assignment is now automatic.
 *
 * This screen is kept in the navigation stack for backwards-compatibility
 * but informs the client that no manual action is required.
 * Agents are automatically assigned as soon as they apply.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UserCheck, Zap, CheckCircle2, Info } from 'lucide-react-native';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'SelectAgent'>;

const STEPS = [
  { Icon: Zap,          color: colors.primary, text: "Un agent qualifié postule à votre mission." },
  { Icon: CheckCircle2, color: colors.success, text: "Il est automatiquement assigné — aucune action de votre part n'est nécessaire." },
  { Icon: UserCheck,    color: colors.info,    text: "Vous recevez une notification push dès qu'un agent prend votre poste." },
];

export const SelectAgentScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Assignation des agents"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Zap size={36} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.heroTitle}>Assignation automatique</Text>
          <Text style={styles.heroSubtitle}>
            Vous n'avez plus besoin de sélectionner manuellement un agent.
            Le premier agent qualifié qui postule est immédiatement assigné à votre mission.
          </Text>
        </View>

        {/* Steps */}
        <Card style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>COMMENT ÇA FONCTIONNE</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepIconWrap, { backgroundColor: step.color + '22' }]}>
                <step.Icon size={16} color={step.color} strokeWidth={2} />
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </Card>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Info size={14} color={colors.info} strokeWidth={2} />
          <Text style={styles.infoText}>
            Seuls les agents avec un profil CNAPS validé et respectant les règles de
            planification peuvent postuler à vos missions.
          </Text>
        </View>

        <Button
          label="Retour à la mission"
          onPress={() => navigation.goBack()}
          fullWidth
          size="lg"
          style={styles.backBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[6], gap: spacing[4] },

  hero:        { alignItems: 'center', gap: spacing[3], paddingBottom: spacing[2] },
  iconCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  heroTitle:   { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6, textAlign: 'center' },
  heroSubtitle:{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSize.base * 1.6, paddingHorizontal: spacing[4] },

  stepsCard:  { gap: spacing[3] },
  stepsTitle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing[1] },
  stepRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  stepIconWrap:{ width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: fontSize.sm * 1.6, paddingTop: 6 },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: colors.infoSurface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.info + '44', padding: spacing[3] },
  infoText:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.info, flex: 1, lineHeight: fontSize.xs * 1.6 },

  backBtn: { marginTop: spacing[2] },
});
