/**
 * PartnerContractDetailScreen - Step 2 (partner side) of the employment flow.
 *
 * Reached right after PartnerContractCreateScreen (navigation.replace) or from
 * a booking that already has a contract. The partner:
 *
 *   1. Reviews the DRAFT contract (legal frame, frozen SNEPS classification,
 *      planned hours, hourly brut)
 *   2. Sees the full *employer* salary preview - including charges patronales
 *      and total employer cost (the agent only sees up to total brut)
 *   3. Signs electronically as employer; once BOTH parties sign the backend
 *      transitions the contract to SIGNED and auto-creates the DPAE (URSSAF).
 *   4. Tracks the DPAE submission status (read-only here; submission is admin).
 *   5. Can cancel a contract that is still DRAFT / SENT_FOR_SIGNATURE.
 *
 * Signing / cancelling invalidates contracts.byBooking + bookings.detail so the
 * originating booking screen reflects the new state on return.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking, TouchableOpacity as HeaderBtn } from 'react-native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck, Briefcase, CalendarClock, Coins, PenLine, CircleCheckBig, Clock, FileCheck2, Download } from 'lucide-react-native';

import {
  useContract,
  useContractSalaryPreview,
  useDpaeByContract,
  useCancelContract,
} from '@api/queries/employment';
import { contractsApi } from '@api/endpoints/employment';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { Badge }        from '@components/ui/Badge';
import { Separator }    from '@components/ui/Separator';
import { LoadingState } from '@components/ui/LoadingState';
import { showAlert }    from '@components/ui/AlertModal';
import { colors, palette }          from '@theme/colors';
import { spacing, layout, radius }  from '@theme/spacing';
import { fontSize, fontFamily }     from '@theme/typography';
import { toNumber, formatEuros, formatDate, formatRate } from '@utils/formatters';
import type {
  PartnerStackParamList,
  EmploymentContractStatus,
  DpaeStatus,
  SalaryPreview,
} from '@models/index';

type Props = NativeStackScreenProps<PartnerStackParamList, 'PartnerContractDetail'>;

type BadgeVariant = 'info' | 'success' | 'danger' | 'warning' | 'primary';
/**
 * badgeForVariant — bridges the legacy variant API (success/warning/...)
 * used by STATUS_VARIANT / DPAE_VARIANT maps to the client Badge's
 * {color, bg} surface pair. Kept inline because it is screen-local.
 */
function badgeForVariant(v: string): { color: string; bg: string } {
  switch (v) {
    case 'success': return { color: colors.success, bg: colors.successSurface };
    case 'warning': return { color: colors.warning, bg: colors.warningSurface };
    case 'danger':  return { color: colors.danger,  bg: colors.dangerSurface };
    case 'info':    return { color: colors.info,    bg: colors.infoSurface };
    case 'accent':  return { color: colors.accent,  bg: colors.accentSurface };
    default:        return { color: colors.primary, bg: colors.primarySurface };
  }
}
const STATUS_VARIANT: Record<EmploymentContractStatus, BadgeVariant> = {
  DRAFT:              'warning',
  SENT_FOR_SIGNATURE: 'info',
  SIGNED:             'success',
  CANCELLED:          'danger',
};
const DPAE_VARIANT: Record<DpaeStatus, BadgeVariant> = {
  PENDING:      'warning',
  SUBMITTED:    'info',
  ACKNOWLEDGED: 'success',
  FAILED:       'danger',
};

export const PartnerContractDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = usePartnerT();
  const { contractId, bookingId } = route.params;

  const contractQ = useContract(contractId);
  const contract  = contractQ.data;
  const salaryQ   = useContractSalaryPreview(contractId);
  const dpaeQ     = useDpaeByContract(contractId);
  const cancelMut = useCancelContract(bookingId);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const { data: res } = await contractsApi.generatePdfUrl(contractId);
      const url = res?.data?.url;
      if (url) await Linking.openURL(url);
    } catch (err: any) {
      showAlert(t('common:errors.title'), err?.response?.data?.message ?? t('common:errors.generic'));
    } finally {
      setPdfLoading(false);
    }
  }, [contractId, t]);

  // handleSign removed: employer is auto-presigned at creation (PLATFORM_AUTO_PRESIGN)

  const handleCancel = useCallback(() => {
    if (!contract) return;
    showAlert(
      t('partner:employment.contract.detail.cancel.confirmTitle'),
      t('partner:employment.contract.detail.cancel.confirmBody'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('partner:employment.contract.detail.cancel.confirm'),
          style: 'destructive',
          onPress: () => cancelMut.mutate(
            { id: contract.id, reason: t('partner:employment.contract.detail.cancel.reasonDefault') },
            {
              onSuccess: () => {
                showAlert(
                  t('partner:employment.contract.detail.cancel.successTitle'),
                  t('partner:employment.contract.detail.cancel.successBody'),
                );
                navigation.goBack();
              },
              onError: (err: any) => showAlert(
                t('common:errors.title'),
                err?.response?.data?.message ?? t('partner:employment.contract.detail.cancel.failed'),
              ),
            },
          ),
        },
      ],
    );
  }, [contract, cancelMut, navigation, t]);

  if (contractQ.isLoading || !contract) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('partner:employment.contract.detail.title')} onBack={() => navigation.goBack()} showBack />
        <LoadingState message={t('partner:employment.contract.detail.loading')} />
      </View>
    );
  }

  const isOpenState = contract.status === 'DRAFT' || contract.status === 'SENT_FOR_SIGNATURE';
  // Employer is now auto-presigned at contract creation · no manual partner sign needed
  const canCancel   = isOpenState;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('partner:employment.contract.detail.title')} onBack={() => navigation.goBack()} showBack rightAction={<HeaderBtn onPress={handleDownloadPdf} style={{ padding: 8 }}><Download size={18} color={pdfLoading ? colors.textMuted : colors.primary} strokeWidth={2} /></HeaderBtn>} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={contractQ.isRefetching}
            onRefresh={() => { contractQ.refetch(); salaryQ.refetch(); dpaeQ.refetch(); }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.statusRow}>
          <Badge label={t(`partner:employment.status.${contract.status}`)} {...badgeForVariant(STATUS_VARIANT[contract.status])} />
          <Text style={styles.ref}>#{contract.id.slice(0, 8)}</Text>
        </View>

        {/* Legal frame */}
        <Card style={styles.card}>
          <CardTitle Icon={ShieldCheck} text={t('partner:employment.contract.detail.sections.legal')} />
          <Separator marginV={spacing[2]} />
          <KeyValue label={t('partner:employment.contract.detail.fields.motif')} value={t(`partner:employment.motifs.${contract.motif}`)} />
          <KeyValue label={t('partner:employment.contract.detail.fields.legalCode')} value={contract.motifLegalCode} mono />
          <KeyValue label={t('partner:employment.contract.detail.fields.justification')} value={contract.justification} multiline />
        </Card>

        {/* SNEPS classification */}
        <Card style={styles.card}>
          <CardTitle Icon={Briefcase} text={t('partner:employment.contract.detail.sections.classification')} />
          <Separator marginV={spacing[2]} />
          <KeyValue label={t('partner:employment.contract.detail.fields.category')} value={t(`partner:employment.categories.${contract.snepsCategory}`)} />
          <KeyValue label={t('partner:employment.contract.detail.fields.niveau')} value={String(contract.snepsNiveau)} />
          <KeyValue label={t('partner:employment.contract.detail.fields.echelon')} value={String(contract.snepsEchelon)} />
          <KeyValue label={t('partner:employment.contract.detail.fields.coefficient')} value={String(contract.snepsCoefficient)} mono />
          <KeyValue label={t('partner:employment.contract.detail.fields.hourlyBrut')} value={formatRate(toNumber(contract.hourlyBrut))} />
        </Card>

        {/* Period */}
        <Card style={styles.card}>
          <CardTitle Icon={CalendarClock} text={t('partner:employment.contract.detail.sections.period')} />
          <Separator marginV={spacing[2]} />
          <KeyValue label={t('partner:employment.contract.detail.fields.start')} value={formatDate(contract.startAt)} />
          <KeyValue label={t('partner:employment.contract.detail.fields.end')} value={formatDate(contract.endAt)} />
          <KeyValue label={t('partner:employment.contract.detail.fields.plannedHours')} value={`${toNumber(contract.plannedHours)} h`} mono />
        </Card>

        {/* Employer salary preview */}
        <Card style={styles.card}>
          <CardTitle Icon={Coins} text={t('partner:employment.contract.detail.sections.employer')} />
          <Separator marginV={spacing[2]} />
          {salaryQ.isLoading ? (
            <LoadingState size="small" />
          ) : salaryQ.data ? (
            <EmployerBreakdown salary={salaryQ.data} t={t} />
          ) : (
            <Text style={styles.muted}>{t('partner:employment.salary.estimate')}</Text>
          )}
        </Card>

        {/* DPAE */}
        <Card style={styles.card}>
          <CardTitle Icon={FileCheck2} text={t('partner:employment.contract.detail.sections.dpae')} />
          <Separator marginV={spacing[2]} />
          {dpaeQ.isLoading ? (
            <LoadingState size="small" />
          ) : dpaeQ.data ? (
            <>
              <View style={kv.row}>
                <Text style={kv.label}>{t('partner:employment.contract.detail.dpae.statusLabel')}</Text>
                <Badge label={t(`partner:employment.contract.detail.dpae.status.${dpaeQ.data.status}`)} {...badgeForVariant(DPAE_VARIANT[dpaeQ.data.status])} />
              </View>
              {dpaeQ.data.submittedAt && (
                <KeyValue label={t('partner:employment.contract.detail.dpae.submittedAt')} value={formatDate(dpaeQ.data.submittedAt)} />
              )}
            </>
          ) : (
            <Text style={styles.muted}>{t('partner:employment.contract.detail.dpae.notCreated')}</Text>
          )}
        </Card>

        {/* Signatures */}
        <Card style={styles.card}>
          <CardTitle Icon={PenLine} text={t('partner:employment.contract.detail.sections.signatures')} />
          <Separator marginV={spacing[2]} />
          <SignatureRow label={t('partner:employment.signature.partner')} signedAt={contract.partnerSignedAt} signerName={contract.partnerSignerName} isPreSigned={contract.partnerSignerDevice === 'PLATFORM_AUTO_PRESIGN'} t={t} />
          <SignatureRow label={t('partner:employment.signature.agent')} signedAt={contract.agentSignedAt} signerName={contract.agentSignerName} t={t} />
        </Card>

        {/* Actions */}
        <View style={styles.actions}>

          {contract.partnerSignedAt && contract.status !== 'CANCELLED' && (
            <View style={styles.signedNotice}>
              <CircleCheckBig size={16} color={colors.success} strokeWidth={2.2} />
              <Text style={styles.signedNoticeTxt}>
                {contract.agentSignedAt
                  ? t('partner:employment.contract.detail.sign.bothSigned')
                  : t('partner:employment.contract.detail.sign.waitingAgent')}
              </Text>
            </View>
          )}

          {canCancel && (
            <Button
              label={t('partner:employment.contract.detail.cancel.cta')}
              onPress={handleCancel}
              loading={cancelMut.isPending}
              variant="danger"
              size="sm"
              fullWidth
            />
          )}
        </View>

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
};

// -- Sub-components ------------------------------------------------------------
type Tfn = (key: string, opts?: Record<string, unknown>) => string;

const CardTitle: React.FC<{ Icon: React.FC<{ size: number; color: string; strokeWidth: number }>; text: string }> = ({ Icon, text }) => (
  <View style={styles.iconRow}>
    <Icon size={16} color={palette.gold} strokeWidth={2.2} />
    <Text style={styles.cardTitle}>{text}</Text>
  </View>
);

const KeyValue: React.FC<{ label: string; value: string; mono?: boolean; multiline?: boolean }> = ({ label, value, mono, multiline }) => (
  <View style={[kv.row, multiline && kv.rowCol]}>
    <Text style={kv.label}>{label}</Text>
    <Text style={[kv.value, mono && kv.mono, multiline && kv.valueCol]} numberOfLines={multiline ? undefined : 1}>{value}</Text>
  </View>
);

const EmployerBreakdown: React.FC<{ salary: SalaryPreview; t: Tfn }> = ({ salary, t }) => {
  const ROWS: [string, number | string][] = [
    [t('partner:employment.salary.base'),               salary.base],
    [t('partner:employment.salary.nightSurcharge'),     salary.nightSurcharge],
    [t('partner:employment.salary.sundaySurcharge'),    salary.sundaySurcharge],
    [t('partner:employment.salary.holidaySurcharge'),   salary.holidaySurcharge],
    [t('partner:employment.salary.seniorityPremium'),   salary.seniorityPremium],
    [t('partner:employment.salary.panier'),             salary.panier],
    [t('partner:employment.salary.cynophilePremium'),   salary.cynophilePremium],
    [t('partner:employment.salary.indemniteFinContrat'), salary.indemniteFinContrat],
  ];
  return (
    <View style={{ gap: spacing[2] }}>
      {ROWS.filter(([, v]) => toNumber(v) !== 0).map(([label, v]) => (
        <View key={label} style={kv.row}>
          <Text style={kv.label}>{label}</Text>
          <Text style={[kv.value, kv.mono]}>{formatEuros(toNumber(v))}</Text>
        </View>
      ))}
      <Separator marginV={spacing[1]} />
      <View style={kv.row}>
        <Text style={styles.subTotalLabel}>{t('partner:employment.salary.totalBrut')}</Text>
        <Text style={styles.subTotalValue}>{formatEuros(toNumber(salary.totalBrut))}</Text>
      </View>
      <View style={kv.row}>
        <Text style={kv.label}>{t('partner:employment.salary.employerCharges')}</Text>
        <Text style={[kv.value, kv.mono]}>{formatEuros(toNumber(salary.employerCharges))}</Text>
      </View>
      <Separator marginV={spacing[1]} />
      <View style={kv.row}>
        <Text style={styles.totalLabel}>{t('partner:employment.salary.totalEmployerCost')}</Text>
        <Text style={styles.totalValue}>{formatEuros(toNumber(salary.totalEmployerCost))}</Text>
      </View>
    </View>
  );
};

const SignatureRow: React.FC<{
  label: string;
  signedAt?: string | null;
  signerName?: string | null;
  isPreSigned?: boolean;
  t: Tfn;
}> = ({ label, signedAt, signerName, isPreSigned, t }) => (
  <View style={{ gap: spacing[1] }}>
    <View style={kv.row}>
      <Text style={kv.label}>{label}</Text>
      {signedAt ? (
        <View style={styles.sigChip}>
          <CircleCheckBig size={13} color={colors.success} strokeWidth={2.4} />
          <Text style={styles.sigSigned}>{t('partner:employment.signature.signed', { date: formatDate(signedAt) })}</Text>
        </View>
      ) : (
        <View style={styles.sigChip}>
          <Clock size={13} color={colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.sigPending}>{t('partner:employment.signature.pending')}</Text>
        </View>
      )}
    </View>
    {signedAt && signerName ? (
      <Text style={{ fontFamily: fontFamily.body, fontSize: 11, color: colors.textMuted, marginLeft: spacing[1] }}>
        {signerName}{isPreSigned ? '  ·  Pré-signé automatiquement' : ''}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], gap: spacing[4] },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ref:       { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 0.3 },

  card:      { gap: spacing[2] },
  iconRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2, flex: 1 },

  muted: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },

  subTotalLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  subTotalValue: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  totalLabel:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  totalValue:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: palette.gold },

  actions:     { gap: spacing[3], marginTop: spacing[1] },
  consent:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.6 },

  signedNotice:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.lg, backgroundColor: colors.successSurface, borderWidth: 1, borderColor: colors.success + '44' },
  signedNoticeTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.success, flex: 1 },

  sigChip:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  sigSigned:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success },
  sigPending: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
});

const kv = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  rowCol:   { flexDirection: 'column', alignItems: 'flex-start', gap: spacing[1] },
  label:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  value:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  valueCol: { textAlign: 'left', flex: 0, alignSelf: 'stretch' },
  mono:     { fontFamily: fontFamily.mono, letterSpacing: 0.3 },
});
