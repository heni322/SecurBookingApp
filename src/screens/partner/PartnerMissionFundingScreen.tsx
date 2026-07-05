/**
 * PartnerMissionFundingScreen — Marketplace funding loop (Phase 1 wiring).
 *
 * After a partner (acting as client) creates a mission, it is UNFUNDED and the
 * backend will not publish it to agents until a payment is PAID/PROCESSING
 * (see BookingPolicy.assertPaymentOk). This screen closes that loop:
 *
 *   1. Calculate a quote from the mission's booking lines  (POST /quotes/calculate)
 *   2. Show the IDCC 1351 price breakdown                  (TTC + surcharges)
 *   3. Accept the quote                                    (PATCH /quotes/accept/:id)
 *   4. Declare a bank-transfer / cheque payment            (POST /payments/create-offline)
 *      -> returns IBAN + reference; mission publishes after admin confirmation.
 *
 * The Stripe card path (create-intent) is intentionally omitted here: it needs
 * the native @stripe/stripe-react-native SDK which isn't installed yet. Offline
 * (virement / chèque) is the no-extra-dependency path and matches how French
 * B2B security contracts are usually settled.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Receipt, CircleCheckBig, Landmark, FileText, Copy, ShieldCheck, Clock3,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useMissionQuote, useCalculateQuote, useAcceptQuote } from '@api/queries/quotes';
import { useMissionPayment, useDeclareOfflinePayment } from '@api/queries/payments';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { Separator }    from '@components/ui/Separator';
import { showAlert }    from '@components/ui/AlertModal';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros, toNumber }   from '@utils/formatters';
import type {
  PartnerStackParamList,
  Quote,
  DeclareOfflinePaymentResult,
} from '@models/index';

type Props = NativeStackScreenProps<PartnerStackParamList, 'PartnerMissionFunding'>;
type OfflineMethod = 'VIREMENT' | 'CHEQUE';

export const PartnerMissionFundingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = usePartnerT();
  const { missionId, bookingLines } = route.params;

  const quoteQuery     = useMissionQuote(missionId);
  const paymentQuery   = useMissionPayment(missionId);
  const calculateQuote = useCalculateQuote();
  const acceptQuote    = useAcceptQuote(missionId);
  const declareOffline = useDeclareOfflinePayment(missionId);

  const [method, setMethod] = useState<OfflineMethod>('VIREMENT');
  const [instructions, setInstructions] = useState<DeclareOfflinePaymentResult | null>(null);

  const quote   = quoteQuery.data;
  const payment = paymentQuery.data;

  // Auto-calculate a quote on first mount if none exists yet.
  useEffect(() => {
    if (quoteQuery.isLoading) return;
    if (!quote && !calculateQuote.isPending) {
      calculateQuote.mutate({ missionId, bookingLines });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteQuery.isLoading]);

  const handleAccept = useCallback(() => {
    if (!quote) return;
    acceptQuote.mutate(quote.id, {
      onError: (err: any) =>
        showAlert(t('common:errors.title'), err?.response?.data?.message ?? t('funding.errors.acceptFailed')),
    });
  }, [quote, acceptQuote, t]);

  const handleDeclare = useCallback(() => {
    declareOffline.mutate(
      { missionId, method },
      {
        onSuccess: (res) => {
          const data = ((res.data as any)?.data ?? res.data) as DeclareOfflinePaymentResult;
          setInstructions(data);
        },
        onError: (err: any) =>
          showAlert(t('common:errors.title'), err?.response?.data?.message ?? t('funding.errors.declareFailed')),
      },
    );
  }, [declareOffline, missionId, method, t]);

  const copy = (label: string, value?: string) => {
    if (!value) return;
    Clipboard.setString(value);
    showAlert(t('funding.copied.title'), t('funding.copied.body', { label }));
  };

  const isAccepted = quote?.status === 'ACCEPTED';
  const isFunded   = payment?.status === 'PAID' || payment?.status === 'PROCESSING';

  // ── Loading / calculating state ──────────────────────────────────────────
  if (quoteQuery.isLoading || (calculateQuote.isPending && !quote)) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('funding.title')} onBack={() => navigation.goBack()} showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerText}>{t('funding.calculating')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('funding.title')} onBack={() => navigation.goBack()} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Funded confirmation (offline already declared / paid) */}
        {isFunded && (
          <Card style={styles.successCard}>
            <View style={styles.successRow}>
              <CircleCheckBig size={20} color={colors.success} strokeWidth={2.2} />
              <Text style={styles.successText}>{t('funding.funded')}</Text>
            </View>
          </Card>
        )}

        {/* Quote breakdown */}
        {quote ? (
          <QuoteBreakdown quote={quote} t={t} />
        ) : (
          <Card style={styles.card}>
            <Text style={styles.errorText}>{t('funding.errors.noQuote')}</Text>
            <Button
              label={t('funding.actions.retryQuote')}
              onPress={() => calculateQuote.mutate({ missionId, bookingLines })}
              loading={calculateQuote.isPending}
              fullWidth variant="outline" size="sm"
            />
          </Card>
        )}

        {/* Step 1 — accept the quote */}
        {quote && !isAccepted && !instructions && (
          <Button
            label={t('funding.actions.accept')}
            onPress={handleAccept}
            loading={acceptQuote.isPending}
            fullWidth size="lg"
          />
        )}

        {/* Step 2 — choose offline method + declare */}
        {quote && isAccepted && !instructions && !isFunded && (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>{t('funding.payment.method')}</Text>
            <View style={styles.methodRow}>
              {(['VIREMENT', 'CHEQUE'] as OfflineMethod[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, method === m && styles.methodChipActive]}
                  onPress={() => setMethod(m)}
                  activeOpacity={0.8}
                >
                  <Landmark size={15} color={method === m ? palette.navy : colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.methodTxt, method === m && styles.methodTxtActive]}>
                    {t(`funding.payment.${m}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.noticeRow}>
              <Clock3 size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.noticeTxt}>{t('funding.payment.notice')}</Text>
            </View>
            <Button
              label={t('funding.actions.declare')}
              onPress={handleDeclare}
              loading={declareOffline.isPending}
              fullWidth size="lg"
            />
          </Card>
        )}

        {/* Step 3 — bank instructions */}
        {instructions && (
          <Card style={styles.card}>
            <View style={styles.successRow}>
              <ShieldCheck size={18} color={colors.success} strokeWidth={2.2} />
              <Text style={styles.successText}>{t('funding.instructions.title')}</Text>
            </View>
            <Separator marginV={spacing[3]} />

            <InstrRow label={t('funding.instructions.invoice')} value={instructions.invoiceNumber} onCopy={copy} />
            <InstrRow label={t('funding.instructions.amount')}   value={formatEuros(instructions.amount)} />
            {instructions.instructions?.iban && (
              <InstrRow label="IBAN" value={instructions.instructions.iban} onCopy={copy} mono />
            )}
            {instructions.instructions?.bic && (
              <InstrRow label="BIC" value={instructions.instructions.bic} onCopy={copy} mono />
            )}
            {instructions.instructions?.reference && (
              <InstrRow label={t('funding.instructions.reference')} value={instructions.instructions.reference} onCopy={copy} mono />
            )}
            {instructions.instructions?.beneficiary && (
              <InstrRow label={t('funding.instructions.beneficiary')} value={instructions.instructions.beneficiary} />
            )}
            {instructions.instructions?.address && (
              <InstrRow label={t('funding.instructions.address')} value={instructions.instructions.address} />
            )}
            {instructions.instructions?.message && (
              <View style={styles.msgBox}>
                <FileText size={13} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.msgTxt}>{instructions.instructions.message}</Text>
              </View>
            )}

            <Separator marginV={spacing[3]} />
            <Button
              label={t('funding.actions.done')}
              onPress={() => navigation.navigate('PartnerMissions')}
              fullWidth size="lg"
            />
          </Card>
        )}

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
};

// ── Quote breakdown sub-component ───────────────────────────────────────────
const QuoteBreakdown: React.FC<{ quote: Quote; t: any }> = ({ quote, t }) => {
  const surcharges: [string, number][] = [
    ['night',    toNumber(quote.nightSurcharge)],
    ['weekend',  toNumber(quote.weekendSurcharge)],
    ['holiday',  toNumber(quote.holidaySurcharge)],
    ['urgency',  toNumber(quote.urgencySurcharge)],
    ['luxury',   toNumber(quote.luxurySurcharge)],
    ['seasonal', toNumber(quote.seasonalSurcharge)],
    ['location', toNumber(quote.locationSurcharge)],
  ];
  const activeSurcharges = surcharges.filter(([, v]) => v > 0);

  return (
    <Card style={breakdown.card}>
      <View style={breakdown.header}>
        <Receipt size={16} color={colors.primary} strokeWidth={2} />
        <Text style={breakdown.title}>{t('funding.breakdown.title')}</Text>
      </View>

      <Line label={t('funding.breakdown.agentSalary')} value={formatEuros(quote.totalAgentSalary)} />
      <Line label={t('funding.breakdown.fixedCharges')} value={formatEuros(quote.fixedCharges)} />
      {activeSurcharges.map(([key, val]) => (
        <Line key={key} label={t(`funding.breakdown.surcharges.${key}`)} value={formatEuros(val)} />
      ))}
      <Line label={t('funding.breakdown.platformMargin')} value={formatEuros(quote.platformMargin)} />

      <Separator marginV={spacing[3]} />
      <Line label={t('funding.breakdown.totalHT')} value={formatEuros(quote.totalClientPrice)} emphasis />
      <Line label={t('funding.breakdown.vat', { rate: toNumber(quote.vatRate) })}
            value={formatEuros(toNumber(quote.totalWithVat) - toNumber(quote.totalClientPrice))} />
      <Separator marginV={spacing[3]} />
      <Line label={t('funding.breakdown.totalTTC')} value={formatEuros(quote.totalWithVat)} total />

      <View style={breakdown.statusRow}>
        <Text style={breakdown.statusLabel}>{t('funding.breakdown.status')}</Text>
        <Text style={[breakdown.statusValue, quote.status === 'ACCEPTED' && { color: colors.success }]}>
          {t(`funding.status.${quote.status}`, { defaultValue: quote.status })}
        </Text>
      </View>
    </Card>
  );
};

const Line: React.FC<{ label: string; value: string; emphasis?: boolean; total?: boolean }> = ({ label, value, emphasis, total }) => (
  <View style={breakdown.line}>
    <Text style={[breakdown.lineLabel, emphasis && breakdown.lineLabelEmph, total && breakdown.lineLabelTotal]}>{label}</Text>
    <Text style={[breakdown.lineValue, emphasis && breakdown.lineLabelEmph, total && breakdown.lineValueTotal]}>{value}</Text>
  </View>
);

const InstrRow: React.FC<{ label: string; value: string; onCopy?: (l: string, v?: string) => void; mono?: boolean }> = ({ label, value, onCopy, mono }) => (
  <View style={styles.instrRow}>
    <Text style={styles.instrLabel}>{label}</Text>
    <View style={styles.instrValueWrap}>
      <Text style={[styles.instrValue, mono && styles.instrValueMono]} numberOfLines={2}>{value}</Text>
      {onCopy && (
        <TouchableOpacity onPress={() => onCopy(label, value)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Copy size={14} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: colors.background },
  content:    { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], gap: spacing[4] },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  card:       { gap: spacing[3] },
  errorText:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },

  successCard: { backgroundColor: colors.successSurface, borderColor: colors.success },
  successRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  successText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.success, flex: 1 },

  sectionLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  methodRow:  { flexDirection: 'row', gap: spacing[2] },
  methodChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], height: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  methodChipActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  methodTxt:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  methodTxtActive:  { color: palette.navy },

  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  noticeTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.5 },

  instrRow:       { gap: 4 },
  instrLabel:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  instrValueWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  instrValue:     { flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  instrValueMono: { fontFamily: fontFamily.mono, letterSpacing: 0.3 },

  msgBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing[3], borderWidth: 1, borderColor: colors.border },
  msgTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
});

const breakdown = StyleSheet.create({
  card:   { gap: spacing[2] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  title:  { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  line:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineLabel:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  lineValue:   { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.textPrimary },
  lineLabelEmph:  { fontFamily: fontFamily.bodySemiBold, color: colors.textPrimary },
  lineLabelTotal: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary },
  lineValueTotal: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: palette.gold },
  statusRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2] },
  statusLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary },
});
