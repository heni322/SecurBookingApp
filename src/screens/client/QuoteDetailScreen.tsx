/**
 * QuoteDetailScreen — displays the quote and triggers Stripe payment.
 *
 * FIX (expired quote): The "Recalculer" button previously only called load()
 * which re-fetched GET /quotes/mission/:id returning the same expired quote.
 * Now it fetches the mission to get booking lines, calls POST /quotes/calculate
 * (the backend upserts — replacing the expired quote with a fresh PENDING one),
 * then calls load() to display the renewed quote.
 */
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, CheckCircle2, CreditCard, FileText, Lock, Info, Landmark, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { quotesApi }          from '@api/endpoints/quotes';
import { missionsApi }        from '@api/endpoints/missions';
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
import type { MissionStackParamList, Booking } from '@models/index';
import { useTranslation } from '@i18n';
import { useToast } from '@hooks/useToast';

type Props = NativeStackScreenProps<MissionStackParamList, 'QuoteDetail'>;

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Build bookingLines for POST /quotes/calculate from mission bookings.
 * Groups non-cancelled bookings by serviceTypeId.
 */
function buildBookingLines(bookings: Booking[]): Array<{
  serviceTypeId: string; agentCount: number; agentUniforms: string[];
}> {
  const active = bookings.filter(b =>
    b.serviceTypeId && !['CANCELLED', 'ABANDONED'].includes(b.status),
  );
  const map = new Map<string, { agentCount: number; agentUniforms: string[] }>();
  for (const b of active) {
    const id  = b.serviceTypeId!;
    const row = map.get(id) ?? { agentCount: 0, agentUniforms: [] };
    row.agentCount += 1;
    row.agentUniforms.push(b.uniform ?? 'STANDARD');
    map.set(id, row);
  }
  return Array.from(map.entries()).map(([serviceTypeId, v]) => ({
    serviceTypeId, agentCount: v.agentCount, agentUniforms: v.agentUniforms,
  }));
}

export const QuoteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }     = useTranslation('quote');
  const { t: tc } = useTranslation('common');
  const toast     = useToast();

  const { missionId }                     = route.params;
  const { data: quote, loading, execute } = useApi(quotesApi.getByMission);
  const [accepting,     setAccepting]     = useState(false);
  const [paying,        setPaying]        = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [payMethod,     setPayMethod]     = useState<'CARD' | 'SEPA' | 'OFFLINE'>('CARD');
  const [secondsLeft,   setSecondsLeft]   = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!quote || quote.status !== 'PENDING') { setSecondsLeft(null); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && countdownRef.current) clearInterval(countdownRef.current);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [quote]);

  // isExpired must be a strict boolean — avoid "" (empty string) which is not boolean
  const isExpired   = secondsLeft === 0 || Boolean(quote?.status === 'PENDING' && quote?.expiresAt && new Date(quote.expiresAt) <= new Date());
  const showWarning = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 300;
  const showUrgent  = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 120;

  const handleAccept = async () => {
    if (!quote) return;
    setAccepting(true);
    try {
      await quotesApi.accept(quote.id);
      await load();
    } catch (err: unknown) {
      toast.error((err as any)?.response?.data?.message ?? t('error_accept'), { title: tc('error') });
    } finally {
      setAccepting(false);
    }
  };

  /**
   * FIX: recalculate an expired quote.
   *
   * Previously only called load() which re-fetched GET /quotes/mission/:id
   * returning the same expired quote — the user was stuck.
   *
   * Now:
   *  1. Fetch mission to recover booking lines
   *  2. POST /quotes/calculate — backend upserts a fresh PENDING quote (30-min TTL)
   *  3. load() — re-fetches and displays the renewed quote
   */
  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const { data: missionRes } = await missionsApi.getById(missionId);
      const mission = (missionRes as any).data ?? missionRes;
      const bookingLines = buildBookingLines(mission?.bookings ?? []);

      if (bookingLines.length === 0) {
        toast.error(tc('unknown_error'), { title: tc('error') });
        return;
      }

      await quotesApi.calculate({ missionId, bookingLines });
      await load();
    } catch (err: unknown) {
      toast.error((err as any)?.response?.data?.message ?? tc('unknown_error'), { title: tc('error') });
    } finally {
      setRecalculating(false);
    }
  }, [missionId, load, tc, toast]);

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
        paymentMethod: payMethod as 'CARD' | 'SEPA',
        intentType:    intent.type as 'payment_intent' | 'setup_intent',
      });
    } catch (err: unknown) {
      toast.error((err as any)?.response?.data?.message ?? t('error_pay'), { title: tc('error') });
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

          {/* FIX: expired banner — button now calls handleRecalculate */}
          {isExpired && quote.status === 'PENDING' && (
            <View style={styles.expiredBanner}>
              <AlertTriangle size={18} color={colors.danger} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiredTitle}>{t('expired_title')}</Text>
                <Text style={styles.expiredText}>{t('expired_body')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.recalcBtn, recalculating && styles.recalcBtnDisabled]}
                onPress={handleRecalculate}
                disabled={recalculating}
                activeOpacity={0.75}
              >
                <RefreshCw size={14} color={recalculating ? colors.textMuted : colors.primary} strokeWidth={2} />
                {/* FIX: 'recalculating' key doesn't exist in QuoteNS — use 'recalculate' for both states */}
                <Text style={[styles.recalcText, recalculating && styles.recalcTextDisabled]}>
                  {t('recalculate')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isExpired && showWarning && quote.status === 'PENDING' && (
            <View style={[styles.infoBanner, showUrgent && styles.warnBanner]}>
              <Clock size={18} color={showUrgent ? colors.danger : colors.warning} strokeWidth={1.8} />
              <Text style={[styles.bannerText, { color: showUrgent ? colors.danger : colors.warning }]}>
                {showUrgent
                  ? t('countdown_urgent',  { time: fmtCountdown(secondsLeft ?? 0) })
                  : t('countdown_warning', { time: fmtCountdown(secondsLeft ?? 0) })
                }
              </Text>
            </View>
          )}

          {!isExpired && quote.status === 'PENDING' && !showWarning && (
            <View style={styles.infoBanner}>
              <Clock size={18} color={colors.info} strokeWidth={1.8} />
              <Text style={styles.bannerText}>{t('pending_banner')}</Text>
            </View>
          )}

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
                  <Text style={styles.sepaText}>{t('sepa_note')}</Text>
                </View>
              )}
            </View>
          )}

          {quote.status === 'ACCEPTED' && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
              <Text style={[styles.bannerText, { color: colors.success }]}>{t('accepted_banner')}</Text>
            </View>
          )}

          <QuoteBreakdownCard
            quote={quote}
            onAccept={handleAccept}
            loading={accepting}
            readonly={quote.status !== 'PENDING' || Boolean(isExpired)}
          />

          {quote.status === 'ACCEPTED' && (
            <View style={styles.paySection}>
              <View style={styles.secureRow}>
                <Lock size={13} color={colors.textMuted} strokeWidth={2} />
                {/* FIX: 'secure_stripe' doesn't exist in QuoteNS — use 'secure_note' */}
                <Text style={styles.secureNote}>{t('secure_note')}</Text>
              </View>
              <Button
                label={paying ? t('paying') : payMethod === 'CARD' ? t('pay_card') : payMethod === 'SEPA' ? t('pay_sepa') : t('pay_offline')}
                onPress={payMethod === 'OFFLINE' ? handleOffline : handlePay}
                disabled={paying}
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
  screen:              { flex: 1, backgroundColor: colors.background },
  content:             { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12], gap: spacing[4] },
  infoBanner:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.infoSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.info, gap: spacing[3] },
  successBanner:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.successSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.success, gap: spacing[3] },
  bannerText:          { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.info, lineHeight: fontSize.sm * 1.6 },
  paySection:          { gap: spacing[3] },
  secureRow:           { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  secureNote:          { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.7 },
  methodSection:       { marginTop: spacing[2], marginBottom: spacing[2] },
  methodTitle:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 },
  methodRow:           { flexDirection: 'row', gap: spacing[3] },
  methodChip:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], height: 46, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  methodChipActive:    { backgroundColor: colors.primarySurface, borderColor: colors.primary, borderWidth: 1.5 },
  methodChipText:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  methodChipTextActive:{ color: colors.primary },
  sepaNote:            { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginTop: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  sepaText:            { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary, lineHeight: fontSize.xs * 1.6 },
  warnBanner:          { backgroundColor: colors.warningSurface, borderColor: colors.warning },
  expiredBanner:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.dangerSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.danger },
  expiredTitle:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.danger, marginBottom: 2 },
  expiredText:         { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, lineHeight: 18 },
  recalcBtn:           { flexDirection: 'row', alignItems: 'center', gap: spacing[1]+2, backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: colors.borderPrimary, flexShrink: 0 },
  recalcBtnDisabled:   { backgroundColor: colors.surface, borderColor: colors.border },
  recalcText:          { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  recalcTextDisabled:  { color: colors.textMuted },
});
