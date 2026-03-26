/**
 * MissionSuccessScreen — confirmation visuelle post-paiement.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button }  from '@components/ui/Button';
import { colors }  from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionSuccess'>;

export const MissionSuccessScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId } = route.params;

  const steps = [
    { icon: '✅', label: 'Mission confirmée & payée' },
    { icon: '📢', label: 'Publication aux agents de votre secteur' },
    { icon: '👥', label: 'Sélection de vos agents parmi les candidats' },
    { icon: '🛡',  label: 'Mission opérationnelle' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkEmoji}>🛡</Text>
        </View>
        <Text style={styles.title}>Mission lancée !</Text>
        <Text style={styles.subtitle}>
          Votre paiement a été confirmé. Voici la suite du processus :
        </Text>
      </View>

      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
              <Text style={styles.stepIcon}>{s.icon}</Text>
            </View>
            {i < steps.length - 1 && <View style={styles.stepLine} />}
            <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Suivre ma mission"
          onPress={() => navigation.navigate('MissionDetail', { missionId })}
          fullWidth
          size="lg"
        />
        <Button
          label="Retour à l'accueil"
          onPress={() => navigation.navigate('MissionList')}
          fullWidth
          variant="ghost"
          size="md"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPaddingH,
  },
  hero: {
    alignItems:   'center',
    paddingTop:   spacing[16],
    paddingBottom: spacing[8],
    gap:          spacing[4],
  },
  checkCircle: {
    width:           110,
    height:          110,
    borderRadius:    55,
    backgroundColor: colors.primarySurface,
    borderWidth:     2,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  checkEmoji: { fontSize: 54 },
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
    lineHeight: fontSize.base * 1.6,
  },
  steps: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing[4],
    marginBottom:  0,
    position:      'relative',
  },
  stepDot: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  stepDotActive: {
    backgroundColor: colors.primarySurface,
    borderColor:     colors.primary,
  },
  stepIcon:  { fontSize: 18 },
  stepLine: {
    position:        'absolute',
    left:            19,
    top:             40,
    width:           2,
    height:          spacing[6],
    backgroundColor: colors.border,
  },
  stepLabel: {
    flex:        1,
    paddingTop:  spacing[2],
    fontFamily:  fontFamily.body,
    fontSize:    fontSize.sm,
    color:       colors.textMuted,
    lineHeight:  fontSize.sm * 1.5,
  },
  stepLabelActive: {
    color:      colors.textPrimary,
    fontFamily: fontFamily.bodyMedium,
  },
  actions: {
    marginTop: spacing[8],
    gap:       spacing[3],
  },
});
