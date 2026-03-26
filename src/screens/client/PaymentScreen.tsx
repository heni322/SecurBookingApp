/**
 * PaymentScreen — confirmation de paiement Stripe.
 * En production : intégrer @stripe/stripe-react-native pour le sheet natif.
 * Ici : simulation de confirmation avec le clientSecret reçu.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, Alert, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button }      from '@components/ui/Button';
import { Card }        from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }   from '@components/ui/Separator';
import { colors }      from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'PaymentScreen'>;

export const PaymentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId, clientSecret } = route.params;
  const [loading, setLoading]       = useState(false);
  const [paid,    setPaid]          = useState(false);

  /**
   * En production, remplacer cette logique par :
   *   const { confirmPayment } = useStripe();
   *   const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });
   */
  const handleConfirmPayment = async () => {
    setLoading(true);
    try {
      // Simuler la confirmation (remplacer par Stripe SDK)
      await new Promise<void>((res) => setTimeout(res, 1800));
      setPaid(true);
    } catch {
      Alert.alert('Paiement refusé', 'Veuillez vérifier vos informations bancaires et réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✅</Text>
        </View>
        <Text style={styles.successTitle}>Paiement confirmé !</Text>
        <Text style={styles.successSubtitle}>
          Votre mission est maintenant confirmée. Nous publions les postes aux agents qualifiés dans votre secteur.
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

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Paiement"
        subtitle="Sécurisé par Stripe"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stripe placeholder */}
        <Card style={styles.stripeCard} elevated>
          <View style={styles.stripeHeader}>
            <Text style={styles.stripeTitle}>🔒 Stripe Checkout</Text>
            <Text style={styles.stripeSubtitle}>Chiffrement TLS 256-bit</Text>
          </View>
          <Separator marginV={spacing[4]} />

          {/* Card Number */}
          <Text style={styles.fieldLabel}>Numéro de carte</Text>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldPlaceholder}>1234  5678  9012  3456</Text>
            <Text style={styles.cardBrand}>💳</Text>
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
              </View>
            </View>
          </View>

          <View style={styles.stripeBadges}>
            <Text style={styles.stripeBadge}>Visa</Text>
            <Text style={styles.stripeBadge}>Mastercard</Text>
            <Text style={styles.stripeBadge}>CB</Text>
            <Text style={styles.stripeBadge}>AMEX</Text>
          </View>
        </Card>

        {/* Integration notice */}
        <View style={styles.devNotice}>
          <Text style={styles.devNoticeText}>
            💡 En production, intégrer{' '}
            <Text style={styles.devNoticeCode}>@stripe/stripe-react-native</Text>
            {' '}et appeler{' '}
            <Text style={styles.devNoticeCode}>confirmPayment(clientSecret)</Text>
            {' '}pour le sheet natif sécurisé.
          </Text>
        </View>

        {/* Récap clientSecret (debug) */}
        <Card style={styles.secretCard}>
          <Text style={styles.secretLabel}>Payment Intent</Text>
          <Text style={styles.secretValue} numberOfLines={1}>
            {clientSecret.slice(0, 30)}…
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={loading ? 'Traitement en cours…' : '💳  Confirmer le paiement'}
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
  screen:         { flex: 1, backgroundColor: colors.background },
  content:        { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[6], gap: spacing[4] },
  stripeCard:     { gap: spacing[3] },
  stripeHeader:   { gap: spacing[1] },
  stripeTitle: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
  },
  stripeSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.success },
  fieldLabel: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  spacing[2],
  },
  fieldBox: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    height:          48,
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingHorizontal: spacing[4],
    marginBottom:    spacing[3],
  },
  fieldPlaceholder: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.textMuted },
  cardBrand:        { fontSize: 20 },
  row:  { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  stripeBadges: {
    flexDirection: 'row',
    gap:           spacing[2],
    marginTop:     spacing[2],
  },
  stripeBadge: {
    fontFamily:      fontFamily.bodyMedium,
    fontSize:        fontSize.xs,
    color:           colors.textMuted,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius:    radius.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  devNotice: {
    backgroundColor: colors.warningSurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.warning,
  },
  devNoticeText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.warning, lineHeight: fontSize.xs * 1.7 },
  devNoticeCode: { fontFamily: fontFamily.mono, color: colors.primaryLight },
  secretCard:    { gap: spacing[1] },
  secretLabel:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  secretValue:   { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textSecondary },
  footer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[4],
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    gap:               spacing[2],
  },
  footerNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: fontSize.xs * 1.6 },

  // Success state
  successScreen: {
    flex:            1,
    backgroundColor: colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: layout.screenPaddingH,
    gap:             spacing[4],
  },
  successIcon: {
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: colors.successSurface,
    borderWidth:     2,
    borderColor:     colors.success,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing[2],
  },
  successEmoji:    { fontSize: 50 },
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
