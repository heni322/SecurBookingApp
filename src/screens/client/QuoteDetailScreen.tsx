/**
 * QuoteDetailScreen — displays the quote and triggers Stripe payment.
 *
 * FIX #7: Added a live TTL countdown (30 min) so the client knows when the
 * quote expires. Shows a warning banner at T-5 min, a red countdown at T-2 min,
 * and an "expired" state with a "Recalculate" button once the quote has expired.
 */
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, CheckCircle2, CreditCard, FileText, Lock, Info, Landmark, AlertTriangle, RefreshCw, Building2 } from 'lucide-react-native';
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
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'QuoteDetail'>;

/** Format seconds as mm:ss */
function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const QuoteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }     = useTranslation('quote');
  const { t: tc } = useTranslation('common');

  const { missionId }                     = route.params;
  const { data: quote, loading, execute } = useApi(quotesApi.getByMission);
  const [accepting,   setAccepting]       = useState(false);
  const [paying,      setPaying]          = useState(false);
  const [payMethod,   setPayMethod]       = useState<'CARD' | 'SEPA' | 'OFFLINE'>('CARD');
  const [secondsLeft, setSecondsLeft]     = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  // Start or reset the countdown whenever the quote changes
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!quote || quote.status !== 'PENDING') {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && countdownRef.current) clearInterval(countdownRef.current);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [quote]);

  const isExpired = secondsLeft === 0 || (quote?.status === 'PENDING' && quote?.expiresAt && new Date(quote.expiresAt) <= new Date());
  const showWarning = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 300;  // last 5 min
  const showUrgent  = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 120;  // last 2 min

  const handleAccept = async () => {
    if (!quote) return;
    setAccepting(true);
    try {
      await quotesApi.accept(quote.id);
      await load();
    } catch (err: unknown) {
      Alert.alert(tc('error'), (err as any)?.response?.data?.message ?? t('error_accept'));
    } finally {
      setAccepting(false);
    }
  };

  const handleOffline = () => {
    if (!quote) return;
    navigation.navigate('OfflinePayment', { missionId, totalTTC: quote.totalWithVat });
  };

  const handlePay = async () => {
    if (!quote) return;
    setPaying(true);
    try {
      const { data: res } = await paymentsApi.createIntent({ missionId, method: payMethod as 'CARD' | 'SEPA' });
      const intent = (res as any).data;
      navigation.navigate('PaymentScreen', {
        missionId,
        clientSecret:  intent.clientSecret,
        totalTTC:      quote.totalWithVat,
        // FIX #2 — pass paymentMethod and intentType so PaymentScreen
        // can correctly detect isSepa and route CARD vs SEPA confirm flow.
        paymentMethod: payMethod as 'CARD' | 'SEPA',
        intentType:    intent.type as 'payment_intent' | 'setup_intent',
      });
    } catch (err: unknown) {
      Alert.alert(tc('error'), (err as any)?.response?.data?.message ?? t('error_pay'));
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('title')}
        subtitle={quote ? `Réf. #${missionId.slice(-6).toUpperCase()}` : ''}
        onBack={() => navigation.goBack()}
      />

      {loading && !quote ? (
        <LoadingState message={t('loading')} />
      ) : !quote ? (
        <EmptyState Icon={FileText} title={t('empty_title')} subtitle={t('empty_subtitle')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* FIX #7 — Expired state: quote TTL elapsed */}
          {isExpired && quote.status === 'PENDING' && (
            <View style={styles.expiredBanner}>
              <AlertTriangle size={18} color={colors.danger} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiredTitle}>Devis expiré</Text>
                <Text style={styles.expiredText}>
                  Ce devis a expiré. Veuillez en générer un nouveau pour continuer.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.recalcBtn}
                onPress={async () => { setAccepting(true); try { await load(); } finally { setAccepting(false); } }}
                disabled={accepting}
              >
                <RefreshCw size={14} color={colors.primary} strokeWidth={2} />
                <Text style={styles.recalcText}>Recalculer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* FIX #7 — Countdown warning banner */}
          {!isExpired && showWarning && quote.status === 'PENDING' && (
            <View style={[styles.infoBanner, showUrgent && styles.warnBanner]}> 
              <Clock size={18} color={showUrgent ? colors.danger : colors.warning} strokeWidth={1.8} />
              <Text style={[styles.bannerText, { color: showUrgent ? colors.danger : colors.warning }]}> 
                {showUrgent
                  ? `⚠ Ce devis expire dans ${fmtCountdown(secondsLeft ?? 0)} — acceptez-le maintenant`
                  : `Ce devis est valable encore ${fmtCountdown(secondsLeft ?? 0)}`
                }
              </Text>
            </View>
          )}

          {/* Pending banner (normal state) */}
          {!isExpired && quote.status === 'PENDING' && !showWarning && (
            <View style={styles.infoBanner}>
              <Clock size={18} color={colors.info} strokeWidth={1.8} />
              <Text style={styles.bannerText}>{t('pending_banner')}</Text>
            </View>
          )}

          {/* Payment method selector */}
          {quote.status === 'ACCEPTED' && (
            <View style={styles.methodSection}>
              <Text style={styles.methodTitle}>{t('payment_method')}</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodChip, payMethod === 'CARD' && styles.methodChipActive]}
                  onPress={() => setPayMethod('CARD')} activeOpacity={0.75}
                >
                  <CreditCard size={16} color={payMethod === 'CARD' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.methodChipText, payMethod === 'CARD' && styles.methodChipTextActive]}>{t('card')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodChip, payMethod === 'SEPA' && styles.methodChipActive]}
                  onPress={() => setPayMethod('SEPA')} activeOpacity={0.75}
                >
                  <Landmark size={16} color={payMethod === 'SEPA' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.methodChipText, payMethod === 'SEPA' && styles.methodChipTextActive]}>{t('sepa')}</Text>
                </TouchableOpacity>
              </View>
              {payMethod === 'SEPA' && (
                <View style={styles.sepaNote}>
                  <Info size={13} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.sepaText}>
                    Le virement SEPA sera traité en 1 à 2 jours ouvrés. Votre IBAN sera collecté sur la page suivante via Stripe.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Accepted banner */}
          {quote.status === 'ACCEPTED' && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
              <Text style={[styles.bannerText, { color: colors.success }]}>
                Quote accepted — proceed to payment to confirm your mission.
              </Text>
            </View>
          )}

          {/* Breakdown card */}
          <QuoteBreakdownCard
            quote={quote}
            onAccept={handleAccept}
            loading={accepting}
            readonly={quote.status !== 'PENDING'}
          />

          {/* Pay button */}
          {quote.status === 'ACCEPTED' && (
            <View style={styles.paySection}>
              <View style={styles.secureRow}>
                <Lock size={13} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.secureNote}>
                  Secure payment via Stripe — your bank details never pass through our servers.
                </Text>
              </View>
              <Button
                label={paying ? t('paying') : payMethod === 'CARD' ? t('pay_card') : payMethod === 'SEPA' ? t('pay_sepa') : 'Paiement hors-ligne'}
                onPress={payMethod === 'OFFLINE' ? handleOffline : handlePay}
                disabled={paying}
                loading={paying}
                fullWidth size="lg"
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:              { flex: 1, backgroundColor: colors.background },
  content:             { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12], gap: spacing[4] },
  infoBanner:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.infoSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.info, gap: spacing[3] },
  successBanner:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.successSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.success, gap: spacing[3] },
  bannerText:          { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.info, lineHeight: fontSize.sm * 1.6 },
  paySection:          { gap: spacing[3] },
  secureRow:           { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  secureNote:          { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.7 },
  methodSection:       { marginTop: spacing[2], marginBottom: spacing[2] },
  methodTitle:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 },
  methodRow:           { flexDirection: 'row', gap: spacing[3] },
  methodChip:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], height: 46, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  methodChipActive:    { backgroundColor: colors.primarySurface, borderColor: colors.primary, borderWidth: 1.5 },
  methodChipText:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  methodChipTextActive:{ color: colors.primary },
  sepaNote:            { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginTop: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  sepaText:            { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary, lineHeight: fontSize.xs * 1.6 },
  // FIX #7 styles — expiry + countdown
  warnBanner:    { backgroundColor: colors.warningSurface, borderColor: colors.warning },
  expiredBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.dangerSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.danger },
  expiredTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.danger, marginBottom: 2 },
  expiredText:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, lineHeight: 18 },
  recalcBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing[1]+2, backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: colors.borderPrimary, flexShrink: 0 },
  recalcText:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
});