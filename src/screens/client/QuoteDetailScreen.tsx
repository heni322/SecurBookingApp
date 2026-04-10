/**
 * QuoteDetailScreen — affiche le devis et déclenche le paiement Stripe.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, CheckCircle2, CreditCard, Lock, Info, Landmark } from 'lucide-react-native';
import { quotesApi }          from '@api/endpoints/quotes';
import { paymentsApi }        from '@api/endpoints/payments';
import { useApi }             from '@hooks/useApi';
import { QuoteBreakdownCard } from '@components/domain/QuoteBreakdownCard';
import { LoadingState }       from '@components/ui/LoadingState';
import { EmptyState }         from '@components/ui/EmptyState';
import { ScreenHeader }       from '@components/ui/ScreenHeader';
import { Button }             from '@components/ui/Button';
import { colors }             from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'QuoteDetail'>;

export const QuoteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId }                     = route.params;
  const { data: quote, loading, execute } = useApi(quotesApi.getByMission);
  const [accepting, setAccepting]         = useState(false);
  const [paying,    setPaying]            = useState(false);
  const [payMethod, setPayMethod]          = useState<'CARD' | 'SEPA'>('CARD');

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleAccept = async () => {
    if (!quote) return;
    setAccepting(true);
    try {
      await quotesApi.accept(quote.id);
      await load();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Impossible d'accepter le devis";
      Alert.alert('Erreur', msg);
    } finally {
      setAccepting(false);
    }
  };

  const handlePay = async () => {
    if (!quote) return;
    setPaying(true);
    try {
      const { data: res } = await paymentsApi.createIntent({
        missionId,
        method: payMethod,
      });
      const intent = (res as any).data;
      navigation.navigate('PaymentScreen', {
        missionId,
        clientSecret: intent.clientSecret,
        totalTTC:     quote.totalWithVat,
      });
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Impossible d'initier le paiement";
      Alert.alert('Erreur', msg);
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Devis"
        subtitle={quote ? `Réf. #${missionId.slice(-6).toUpperCase()}` : ''}
        onBack={() => navigation.goBack()}
      />

      {loading && !quote ? (
        <LoadingState message="Génération du devis…" />
      ) : !quote ? (
        <EmptyState
          icon="📄"
          title="Devis introuvable"
          subtitle="Le devis n'a pas encore été généré pour cette mission."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Bandeaux contextuels */}
          {quote.status === 'PENDING' && (
            <View style={styles.infoBanner}>
              <Clock size={18} color={colors.info} strokeWidth={1.8} />
              <Text style={styles.bannerText}>
                Vérifiez le détail tarifaire et acceptez le devis pour procéder au paiement.
              </Text>
            </View>
          )}

          {/* ── Sélecteur mode de paiement ── */}
          {quote.status === 'ACCEPTED' && (
            <View style={styles.methodSection}>
              <Text style={styles.methodTitle}>Mode de paiement</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodChip, payMethod === 'CARD' && styles.methodChipActive]}
                  onPress={() => setPayMethod('CARD')}
                  activeOpacity={0.75}
                >
                  <CreditCard size={16} color={payMethod === 'CARD' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.methodChipText, payMethod === 'CARD' && styles.methodChipTextActive]}>Carte bancaire</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodChip, payMethod === 'SEPA' && styles.methodChipActive]}
                  onPress={() => setPayMethod('SEPA')}
                  activeOpacity={0.75}
                >
                  <Landmark size={16} color={payMethod === 'SEPA' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.methodChipText, payMethod === 'SEPA' && styles.methodChipTextActive]}>Virement SEPA</Text>
                </TouchableOpacity>
              </View>
              {payMethod === 'SEPA' && (
                <View style={styles.sepaNote}>
                  <Info size={13} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.sepaText}>
                    Le virement SEPA est traité sous 1–2 jours ouvrés. Votre IBAN sera collecté sur la page suivante via Stripe.
                  </Text>
                </View>
              )}
            </View>
          )}

          {quote.status === 'ACCEPTED' && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
              <Text style={[styles.bannerText, { color: colors.success }]}>
                Devis accepté — procédez au paiement pour valider votre mission.
              </Text>
            </View>
          )}

          {/* Carte de breakdown */}
          <QuoteBreakdownCard
            quote={quote}
            onAccept={handleAccept}
            loading={accepting}
            readonly={quote.status !== 'PENDING'}
          />

          

          {quote.status === 'ACCEPTED' && (
            <View style={styles.paySection}>
              <View style={styles.secureRow}>
                <Lock size={13} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.secureNote}>
                  Paiement sécurisé via Stripe — vos données bancaires ne transitent jamais par nos serveurs.
                </Text>
              </View>
              <Button
                label={paying ? 'Redirection…' : 'Payer maintenant'}
                onPress={paying ? undefined : handlePay}
                loading={paying}
                fullWidth
                size="lg"
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[12],
    gap:               spacing[4],
  },
  infoBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.infoSurface,
    borderRadius:    radius.xl,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.info,
    gap:             spacing[3],
  },
  successBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.successSurface,
    borderRadius:    radius.xl,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.success,
    gap:             spacing[3],
  },
  bannerText: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.info,
    lineHeight: fontSize.sm * 1.6,
  },
  paySection: { gap: spacing[3] },
  secureRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  secureNote: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    lineHeight: fontSize.xs * 1.7,
  },
  methodSection:      { marginTop: spacing[2], marginBottom: spacing[2] },
  methodTitle:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 },
  methodRow:          { flexDirection: 'row', gap: spacing[3] },
  methodChip:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], height: 46, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  methodChipActive:   { backgroundColor: colors.primarySurface, borderColor: colors.primary, borderWidth: 1.5 },
  methodChipText:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  methodChipTextActive:{ color: colors.primary },
  sepaNote:           { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginTop: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  sepaText:           { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary, lineHeight: fontSize.xs * 1.6 },
});
