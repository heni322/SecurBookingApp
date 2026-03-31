/**
 * PaymentScreen — page de paiement Stripe.
 * Icônes : lucide-react-native
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, CreditCard, CheckCircle2, ShieldCheck, Lightbulb } from 'lucide-react-native';
import { Button }      from '@components/ui/Button';
import { Card }        from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }   from '@components/ui/Separator';
import { colors }      from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatCurrency }          from '@utils/formatters';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'PaymentScreen'>;

export const PaymentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId, clientSecret, totalTTC } = route.params;
  const [loading, setLoading] = useState(false);
  const [paid,    setPaid]    = useState(false);

  /**
   * TODO production :
   *   const { confirmPayment } = useStripe();
   *   const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });
   */
  const handleConfirmPayment = async () => {
    setLoading(true);
    try {
      await new Promise<void>((res) => setTimeout(res, 1800));
      setPaid(true);
    } catch {
      Alert.alert('Paiement refusé', 'Veuillez vérifier vos informations et réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // ── Succès ──────────────────────────────────────────────────────────────────
  if (paid) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <CheckCircle2 size={54} color={colors.success} strokeWidth={1.5} />
        </View>
        <Text style={styles.successTitle}>Paiement confirmé !</Text>
        <Text style={styles.successSubtitle}>
          Votre mission est confirmée. Les agents qualifiés dans votre secteur vont recevoir une notification et pourront candidater.
        </Text>
        <Button
          label="Voir ma mission"
          onPress={() => navigation.navigate('MissionDetail', { missionId })}
          fullWidth
          size="lg"
          style={styles.successBtn}
        />
        <Button
          label="Retour à l'accueil"
          onPress={() => navigation.navigate('MissionSuccess', { missionId })}
          fullWidth
          variant="ghost"
          size="md"
        />
      </View>
    );
  }

  // ── Formulaire ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Paiement"
        subtitle="Sécurisé par Stripe"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Récap montant */}
        <Card style={styles.amountCard} elevated>
          <Text style={styles.amountLabel}>Montant total TTC</Text>
          <Text style={styles.amountValue}>
            {totalTTC ? formatCurrency(totalTTC * 100) : '—'}
          </Text>
          <Text style={styles.amountSub}>TVA 20% incluse · Virement agent à J+15</Text>
        </Card>

        {/* Formulaire carte */}
        <Card style={styles.stripeCard} elevated>
          <View style={styles.stripeHeader}>
            <View style={styles.stripeHeaderLeft}>
              <Lock size={18} color={colors.success} strokeWidth={2} />
              <Text style={styles.stripeTitle}>Carte bancaire</Text>
            </View>
            <Text style={styles.stripeSubtitle}>TLS 256-bit</Text>
          </View>
          <Separator marginV={spacing[4]} />

          <Text style={styles.fieldLabel}>Numéro de carte</Text>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldPlaceholder}>1234  5678  9012  3456</Text>
            <CreditCard size={20} color={colors.textMuted} strokeWidth={1.5} />
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Expiration</Text>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldPlaceholder}>MM / AA</Text>
              </View>
            </View>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>CVC</Text>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldPlaceholder}>•••</Text>
                <Lock size={15} color={colors.textMuted} strokeWidth={1.5} />
              </View>
            </View>
          </View>

          {/* Logos CB */}
          <View style={styles.badges}>
            {['Visa', 'Mastercard', 'CB', 'AMEX'].map((b) => (
              <Text key={b} style={styles.badge}>{b}</Text>
            ))}
          </View>
        </Card>

        {/* Note dev */}
        <View style={styles.devNotice}>
          <Lightbulb size={16} color={colors.warning} strokeWidth={1.8} />
          <Text style={styles.devNoticeText}>
            Intégrer{' '}
            <Text style={styles.devCode}>@stripe/stripe-react-native</Text>
            {' '}et appeler{' '}
            <Text style={styles.devCode}>confirmPayment(clientSecret)</Text>
            {' '}pour le sheet natif sécurisé.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={loading ? 'Traitement…' : `Payer ${totalTTC ? formatCurrency(totalTTC * 100) : ''}`}
          onPress={handleConfirmPayment}
          loading={loading}
          fullWidth
          size="lg"
        />
        <Text style={styles.footerNote}>
          En confirmant, vous acceptez les CGV SecurBook et la politique de remboursement.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[6], gap: spacing[4] },

  amountCard:  { alignItems: 'center', gap: spacing[1], paddingVertical: spacing[5] },
  amountLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  amountValue: { fontFamily: fontFamily.display, fontSize: fontSize['3xl'], color: colors.primary, letterSpacing: -1 },
  amountSub:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },

  stripeCard:       { gap: spacing[3] },
  stripeHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stripeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  stripeTitle:      { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.2 },
  stripeSubtitle:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.success },
  fieldLabel: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  spacing[2],
  },
  fieldBox: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    height:            48,
    backgroundColor:   colors.backgroundElevated,
    borderRadius:      radius.md,
    borderWidth:       1,
    borderColor:       colors.border,
    paddingHorizontal: spacing[4],
    marginBottom:      spacing[3],
  },
  fieldPlaceholder: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.textMuted },
  row:  { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  badges: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  badge: {
    fontFamily:        fontFamily.bodyMedium,
    fontSize:          fontSize.xs,
    color:             colors.textMuted,
    backgroundColor:   colors.backgroundElevated,
    paddingHorizontal: spacing[2],
    paddingVertical:   3,
    borderRadius:      radius.sm,
    borderWidth:       1,
    borderColor:       colors.border,
  },

  devNotice: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing[3],
    backgroundColor: colors.warningSurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.warning,
  },
  devNoticeText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.warning, lineHeight: fontSize.xs * 1.7 },
  devCode:       { fontFamily: fontFamily.mono, color: colors.primaryLight },

  footer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[4],
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    gap:               spacing[2],
  },
  footerNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: fontSize.xs * 1.6 },

  // Succès
  successScreen: {
    flex:              1,
    backgroundColor:   colors.background,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPaddingH,
    gap:               spacing[4],
  },
  successIcon: {
    width:           110,
    height:          110,
    borderRadius:    55,
    backgroundColor: colors.successSurface,
    borderWidth:     2,
    borderColor:     colors.success,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing[2],
  },
  successTitle: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.6,
    textAlign:     'center',
  },
  successSubtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.6,
  },
  successBtn: { marginTop: spacing[2] },
});
