/**
 * MissionSuccessScreen — confirmation visuelle post-paiement avec timeline animée.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck, Megaphone, Users, Shield, Check } from 'lucide-react-native';
import { Button }  from '@components/ui/Button';
import { colors, palette } from '@theme/colors';
import { spacing, radius, layout, shadow } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionSuccess'>;

type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

const STEPS: Array<{
  Icon:  LucideIconComp;
  label: string;
  done:  boolean;
  color: string;
}> = [
  { Icon: ShieldCheck, label: 'Mission confirmée & payée',              done: true,  color: colors.success  },
  { Icon: Megaphone,   label: 'Publication aux agents de votre secteur', done: false, color: colors.primary  },
  { Icon: Users,       label: 'Sélection de vos agents',                done: false, color: colors.primary  },
  { Icon: Shield,      label: 'Mission opérationnelle',                  done: false, color: colors.primary  },
];

export const MissionSuccessScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId } = route.params;

  const heroScale    = useRef(new Animated.Value(0.4)).current;
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;
  const stepsTranslY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(heroScale,   { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(heroOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(stepsOpacity,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(stepsTranslY,  { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
        <View style={styles.glowRing}>
          <View style={styles.checkCircle}>
            <ShieldCheck size={52} color={colors.primary} strokeWidth={1.5} />
          </View>
        </View>
        <Text style={styles.title}>Mission lancée !</Text>
        <Text style={styles.subtitle}>
          Votre paiement a été confirmé. Les agents de votre secteur vont recevoir une notification immédiatement.
        </Text>
      </Animated.View>

      {/* Timeline */}
      <Animated.View style={[
        styles.timeline,
        { opacity: stepsOpacity, transform: [{ translateY: stepsTranslY }] },
      ]}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepWrap}>
            {i < STEPS.length - 1 && (
              <View style={[styles.connector, step.done && styles.connectorDone]} />
            )}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                {step.done
                  ? <Check size={18} color={colors.primary} strokeWidth={2.5} />
                  : <step.Icon size={18} color={colors.textMuted} strokeWidth={1.6} />
                }
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
                  {step.label}
                </Text>
                {step.done && <Text style={styles.stepBadge}>Complété</Text>}
              </View>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Info box */}
      <Animated.View style={[styles.infoBox, { opacity: stepsOpacity }]}>
        <Text style={styles.infoText}>
          💡 Vous recevrez une notification dès qu'un agent postule. Vous pourrez alors consulter les candidatures et sélectionner votre équipe.
        </Text>
      </Animated.View>

      {/* Actions */}
      <Animated.View style={[styles.actions, { opacity: stepsOpacity }]}>
        <Button
          label="Voir ma mission"
          onPress={() => navigation.navigate('MissionDetail', { missionId })}
          fullWidth
          size="lg"
        />
        <Button
          label="Retour à l'accueil"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MissionList' }] })}
          fullWidth
          variant="ghost"
          size="md"
        />
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[12],
    paddingBottom:     spacing[10],
    gap:               spacing[8],
  },

  hero:       { alignItems: 'center', gap: spacing[4] },
  glowRing: {
    width:           128,
    height:          128,
    borderRadius:    64,
    backgroundColor: 'rgba(245,166,35,0.10)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     'rgba(245,166,35,0.25)',
  },
  checkCircle: {
    width:           96,
    height:          96,
    borderRadius:    48,
    backgroundColor: colors.primarySurface,
    borderWidth:     2,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    ...shadow.amber,
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['3xl'],
    color:         colors.textPrimary,
    letterSpacing: -1,
    textAlign:     'center',
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.65,
  },

  timeline: { gap: 0 },
  stepWrap: { position: 'relative' },
  connector: {
    position:        'absolute',
    left:            19,
    top:             44,
    width:           2,
    height:          28,
    backgroundColor: colors.border,
    zIndex:          0,
  },
  connectorDone: { backgroundColor: colors.primary },
  stepRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing[4],
    paddingVertical: spacing[3],
    zIndex:          1,
  },
  stepDot: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  stepDotDone: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  stepTextWrap: { flex: 1, gap: 2 },
  stepLabel: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
  },
  stepLabelDone: { fontFamily: fontFamily.bodyMedium, color: colors.textPrimary },
  stepBadge: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.primary,
    letterSpacing: 0.3,
  },

  infoBox: {
    backgroundColor: colors.infoSurface,
    borderRadius:    radius.xl,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.info,
  },
  infoText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.info,
    lineHeight: fontSize.sm * 1.65,
  },

  actions: { gap: spacing[3] },
});
