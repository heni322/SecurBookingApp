/**
 * PartnerContractCreateScreen — Step 1 of the employment workflow.
 *
 * Once a partner assigns an agent to a booking, French labor law (IDCC 1351)
 * requires a written CDD/CDDU contract before work starts. This screen:
 *
 *   1. Pre-fills booking + agent data (start/end, agent name)
 *   2. Captures the legal motif (CDDU / accroissement / remplacement / saisonnier)
 *      + justification (mandatory free text — backend stores verbatim)
 *   3. Captures SNEPS classification (category / niveau / échelon / coefficient)
 *      — the backend will resolve the SNEPS floor and clamp hourlyBrut to it.
 *   4. Optionally captures a seniority rate (0..15%) and cynophile flag.
 *   5. Submits → DRAFT contract, then navigates to the detail screen for signature.
 *
 * Side-effects on success:
 *   - contracts.byBooking(bookingId) is invalidated → BookingDetailScreen
 *     re-renders with the "View contract" action.
 *   - The next screen (ContractDetail) lets the partner sign and pulls the
 *     real-time agent signature state.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FileSignature, ShieldCheck, Briefcase, BadgeCheck, Dog,
} from 'lucide-react-native';

import { useCreateContract } from '@api/queries/employment';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { Input }        from '@components/ui/Input';
import { Separator }    from '@components/ui/Separator';
import { showAlert }    from '@components/ui/AlertModal';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type {
  PartnerStackParamList,
  AgentCategory,
  CddMotif,
  CreateEmploymentContractPayload,
} from '@models/index';

type Props = NativeStackScreenProps<PartnerStackParamList, 'PartnerContractCreate'>;

// Legal motif → default Code du travail reference. The partner can override
// the reference in an advanced flow; default keeps the form on rails.
const MOTIF_LEGAL_CODES: Record<CddMotif, string> = {
  CDDU:          'L1242-2 3°',
  ACCROISSEMENT: 'L1242-2 2°',
  REMPLACEMENT:  'L1242-2 1°',
  SAISONNIER:    'L1242-2 3°',
};

const MOTIFS: CddMotif[] = ['CDDU', 'ACCROISSEMENT', 'REMPLACEMENT', 'SAISONNIER'];
const CATEGORIES: AgentCategory[] = ['AGENT_EXPLOITATION', 'AGENT_MAITRISE', 'CADRE'];

export const PartnerContractCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = usePartnerT();
  const { bookingId, agentName } = route.params;

  const createContract = useCreateContract();

  // ── Form state ────────────────────────────────────────────────────────────
  const [motif, setMotif] = useState<CddMotif>('CDDU');
  const [justification, setJustification] = useState('');
  const [category, setCategory] = useState<AgentCategory>('AGENT_EXPLOITATION');
  const [niveau, setNiveau] = useState('1');
  const [echelon, setEchelon] = useState('1');
  const [coefficient, setCoefficient] = useState('120');
  // Optional. Empty string → backend uses the SNEPS floor.
  const [hourlyBrut, setHourlyBrut] = useState('');
  const [seniorityPct, setSeniorityPct] = useState('0'); // 0..15 (%)
  const [isCynophile, setIsCynophile] = useState(false);

  // Local-only validation — the backend is the source of truth, but a
  // pre-flight check keeps unrecoverable 400s out of the happy path.
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!justification.trim() || justification.trim().length < 10) {
      errors.justification = t('employment.contract.create.errors.justification');
    }
    const n = parseInt(niveau, 10);
    if (!(n >= 1 && n <= 5)) errors.niveau = t('employment.contract.create.errors.niveau');
    const e = parseInt(echelon, 10);
    if (!(e >= 1 && e <= 3)) errors.echelon = t('employment.contract.create.errors.echelon');
    const c = parseInt(coefficient, 10);
    if (!(c >= 100)) errors.coefficient = t('employment.contract.create.errors.coefficient');
    if (hourlyBrut.trim()) {
      const h = parseFloat(hourlyBrut.replace(',', '.'));
      if (!(h > 0)) errors.hourlyBrut = t('employment.contract.create.errors.hourlyBrut');
    }
    const s = parseFloat(seniorityPct.replace(',', '.'));
    if (!(s >= 0 && s <= 15)) errors.seniority = t('employment.contract.create.errors.seniority');
    return errors;
  }, [justification, niveau, echelon, coefficient, hourlyBrut, seniorityPct, t]);

  const isValid = Object.keys(validation).length === 0;

  const handleSubmit = useCallback(() => {
    if (!isValid) {
      showAlert(t('common:errors.title'), t('employment.contract.create.errors.fixForm'));
      return;
    }
    const payload: CreateEmploymentContractPayload = {
      bookingId,
      motif,
      motifLegalCode: MOTIF_LEGAL_CODES[motif],
      justification: justification.trim(),
      snepsCategory: category,
      snepsNiveau: parseInt(niveau, 10),
      snepsEchelon: parseInt(echelon, 10),
      snepsCoefficient: parseInt(coefficient, 10),
      seniorityRate: parseFloat(seniorityPct.replace(',', '.')) / 100, // % → fraction
      isCynophile,
    };
    const h = parseFloat(hourlyBrut.replace(',', '.'));
    if (h > 0) payload.hourlyBrut = h;

    createContract.mutate(payload, {
      onSuccess: (res) => {
        const contract = ((res.data as any)?.data ?? res.data) as { id: string };
        navigation.replace('PartnerContractDetail', { contractId: contract.id, bookingId });
      },
      onError: (err: any) => {
        showAlert(
          t('common:errors.title'),
          err?.response?.data?.message ?? t('employment.contract.create.errors.createFailed'),
        );
      },
    });
  }, [bookingId, motif, justification, category, niveau, echelon, coefficient,
      hourlyBrut, seniorityPct, isCynophile, isValid, createContract, navigation, t]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('employment.contract.create.title')}
        onBack={() => navigation.goBack()}
        showBack
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Context card — booking + agent */}
        <Card style={styles.card}>
          <View style={styles.iconRow}>
            <FileSignature size={16} color={palette.gold} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>{t('employment.contract.create.context')}</Text>
          </View>
          <Separator marginV={spacing[2]} />
          <KeyValue label={t('employment.contract.create.agent')} value={agentName ?? '—'} />
          <KeyValue label={t('employment.contract.create.bookingRef')} value={bookingId.slice(0, 8) + '…'} mono />
        </Card>

        {/* Motif de recours (legal) */}
        <Card style={styles.card}>
          <View style={styles.iconRow}>
            <ShieldCheck size={16} color={palette.gold} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>{t('employment.contract.create.motif.title')}</Text>
          </View>
          <Text style={styles.cardHint}>{t('employment.contract.create.motif.hint')}</Text>
          <View style={styles.chipRow}>
            {MOTIFS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, motif === m && styles.chipActive]}
                onPress={() => setMotif(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipTxt, motif === m && styles.chipTxtActive]}>
                  {t(`employment.contract.create.motif.${m}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.legalCode}>
            {t('employment.contract.create.motif.legalCode')}: {MOTIF_LEGAL_CODES[motif]}
          </Text>
          <Input
            label={t('employment.contract.create.justification.label')}
            placeholder={t('employment.contract.create.justification.placeholder')}
            value={justification}
            onChangeText={setJustification}
            multiline
            numberOfLines={3}
            error={validation.justification}
          />
        </Card>

        {/* Classification SNEPS / IDCC 1351 */}
        <Card style={styles.card}>
          <View style={styles.iconRow}>
            <Briefcase size={16} color={palette.gold} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>{t('employment.contract.create.sneps.title')}</Text>
          </View>
          <Text style={styles.cardHint}>{t('employment.contract.create.sneps.hint')}</Text>

          <Text style={styles.sectionLabel}>{t('employment.contract.create.sneps.category')}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipTxt, category === c && styles.chipTxtActive]}>
                  {t(`employment.contract.create.sneps.categories.${c}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Input
                label={t('employment.contract.create.sneps.niveau')}
                value={niveau}
                onChangeText={setNiveau}
                keyboardType="numeric"
                error={validation.niveau}
              />
            </View>
            <View style={styles.gridCell}>
              <Input
                label={t('employment.contract.create.sneps.echelon')}
                value={echelon}
                onChangeText={setEchelon}
                keyboardType="numeric"
                error={validation.echelon}
              />
            </View>
          </View>

          <Input
            label={t('employment.contract.create.sneps.coefficient')}
            value={coefficient}
            onChangeText={setCoefficient}
            keyboardType="numeric"
            error={validation.coefficient}
          />

          <Input
            label={t('employment.contract.create.sneps.hourlyBrut.label')}
            placeholder={t('employment.contract.create.sneps.hourlyBrut.placeholder')}
            value={hourlyBrut}
            onChangeText={setHourlyBrut}
            keyboardType="decimal-pad"
            error={validation.hourlyBrut}
          />
          <Text style={styles.cardHint}>{t('employment.contract.create.sneps.hourlyBrut.hint')}</Text>
        </Card>

        {/* Additional */}
        <Card style={styles.card}>
          <View style={styles.iconRow}>
            <BadgeCheck size={16} color={palette.gold} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>{t('employment.contract.create.extras.title')}</Text>
          </View>
          <Input
            label={t('employment.contract.create.extras.seniority')}
            value={seniorityPct}
            onChangeText={setSeniorityPct}
            keyboardType="decimal-pad"
            error={validation.seniority}
          />
          <Text style={styles.cardHint}>{t('employment.contract.create.extras.seniorityHint')}</Text>

          <TouchableOpacity
            style={[styles.toggle, isCynophile && styles.toggleActive]}
            onPress={() => setIsCynophile((v) => !v)}
            activeOpacity={0.8}
          >
            <Dog size={16} color={isCynophile ? palette.navy : colors.textMuted} strokeWidth={2} />
            <Text style={[styles.toggleTxt, isCynophile && styles.toggleTxtActive]}>
              {t('employment.contract.create.extras.cynophile')}
            </Text>
          </TouchableOpacity>
        </Card>

        <Button
          label={t('employment.contract.create.actions.submit')}
          onPress={handleSubmit}
          loading={createContract.isPending}
          disabled={!isValid}
          fullWidth
          size="lg"
        />

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────
const KeyValue: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <View style={kvStyles.row}>
    <Text style={kvStyles.label}>{label}</Text>
    <Text style={[kvStyles.value, mono && kvStyles.mono]} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], gap: spacing[4] },

  card:      { gap: spacing[3] },
  cardTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2, flex: 1 },
  cardHint:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.5 },

  iconRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  legalCode: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textSecondary, marginTop: -spacing[1] },

  sectionLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip:           {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive:     { backgroundColor: palette.gold, borderColor: palette.gold },
  chipTxt:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary },
  chipTxtActive:  { color: palette.navy },

  gridRow:  { flexDirection: 'row', gap: spacing[3] },
  gridCell: { flex: 1 },

  toggle:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    height: 44, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  toggleActive:   { backgroundColor: palette.gold, borderColor: palette.gold },
  toggleTxt:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  toggleTxtActive:{ color: palette.navy },
});

const kvStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  label: { fontFamily: fontFamily.body,       fontSize: fontSize.sm, color: colors.textMuted },
  value: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  mono:  { fontFamily: fontFamily.mono, letterSpacing: 0.3 },
});
