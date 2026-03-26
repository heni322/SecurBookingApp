/**
 * QuoteDetailScreen — affiche le devis d'une mission et propose
 * d'accepter → déclenche le paiement Stripe.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, Alert, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { quotesApi }    from '@api/endpoints/quotes';
import { paymentsApi }  from '@api/endpoints/payments';
import { useApi }       from '@hooks/useApi';
import { QuoteBreakdownCard } from '@components/domain/QuoteBreakdownCard';
import { LoadingState }  from '@components/ui/LoadingState';
import { EmptyState }    from '@components/ui/EmptyState';
import { ScreenHeader }  from '@components/ui/ScreenHeader';
import { colors }        from '@theme/colors';
import { spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'QuoteDetail'>;

export const QuoteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId }                                 = route.params;
  const { data: quote, loading, execute }             = useApi(quotesApi.getByMission);
  const [accepting, setAccepting]                     = useState(false);
  const [paying,    setPaying]                        = useState(false);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleAccept = async () => {
    if (!quote) return;
    setAccepting(true);
    try {
      await quotesApi.accept(quote.id);
      await load();
    } catch (err: unknown) {
      Alert.alert('Erreur', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Impossible d\'accepter le devis');
    } finally {
      setAccepting(false);
    }
  };

  const handlePay = async () => {
    if (!quote) return;
    setPaying(true);
    try {
      const { data: res } = await paymentsApi.createIntent({ missionId });
      navigation.navigate('PaymentScreen', {
        missionId,
        clientSecret: res.data.clientSecret,
      });
    } catch (err: unknown) {
      Alert.alert('Erreur', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Impossible d\'initier le paiement');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Devis"
        subtitle={quote ? `Mission #${missionId.slice(-6).toUpperCase()}` : ''}
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
          {/* Info contextuelle selon statut */}
          {quote.status === 'PENDING' && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerIcon}>⏳</Text>
              <Text style={styles.infoBannerText}>
                Vérifiez le détail tarifaire et acceptez le devis pour procéder au paiement.
              </Text>
            </View>
          )}
          {quote.status === 'ACCEPTED' && (
            <View style={styles.successBanner}>
              <Text style={styles.infoBannerIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoBannerText, { color: colors.success }]}>
                  Devis accepté — procédez au paiement pour valider votre mission.
                </Text>
              </View>
            </View>
          )}

          <QuoteBreakdownCard
            quote={quote}
            onAccept={handleAccept}
            loading={accepting}
            readonly={quote.status !== 'PENDING'}
          />

          {/* CTA paiement si devis accepté */}
          {quote.status === 'ACCEPTED' && (
            <View style={styles.payBtnWrap}>
              <Text style={styles.payNote}>
                🔒 Paiement sécurisé via Stripe — vos données bancaires ne transitent jamais par nos serveurs.
              </Text>
              <View
                style={[styles.payBtn, paying && styles.payBtnLoading]}
              >
                <Text
                  style={styles.payBtnText}
                  onPress={paying ? undefined : handlePay}
                >
                  {paying ? 'Redirection…' : '💳  Payer maintenant'}
                </Text>
              </View>
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
    borderRadius:    14,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.info,
    gap:             spacing[3],
  },
  successBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.successSurface,
    borderRadius:    14,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.success,
    gap:             spacing[3],
  },
  infoBannerIcon: { fontSize: 20 },
  infoBannerText: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.info,
    lineHeight: fontSize.sm * 1.6,
  },
  payBtnWrap: {
    gap: spacing[3],
  },
  payNote: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: fontSize.xs * 1.7,
  },
  payBtn: {
    backgroundColor: colors.primary,
    borderRadius:    16,
    paddingVertical: spacing[4],
    alignItems:      'center',
  },
  payBtnLoading: { opacity: 0.6 },
  payBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.md,
    color:      colors.textInverse,
    letterSpacing: 0.2,
  },
});
