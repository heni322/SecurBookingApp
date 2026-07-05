/**
 * PartnerAddDocumentScreen — Soumission d'un document légal société.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePartnerT } from './_partnerI18n';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  pick, types, keepLocalCopy, isErrorWithCode,
} from '@react-native-documents/picker';
import {
  ChevronRight, FileText, Upload, CircleCheckBig,
  Building2, CalendarDays, TriangleAlert, File as FileIcon,
} from 'lucide-react-native';
import { partnerDocumentsApi } from '@api/endpoints/partnerDocuments';
import { useDocumentUpload }   from '@hooks/useDocumentUpload';
import { useWizardSteps }      from '@hooks/useWizardSteps';
import { Button }              from '@components/ui/Button';
import { ScreenHeader }        from '@components/ui/ScreenHeader';
import { showAlert }           from '@components/ui/AlertModal';
import { colors, palette }     from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { MANDATORY_DOC_DESC } from '@utils/statusHelpers';
import { labelDateShort } from '@utils/dateHelpers';
import { type PartnerDocumentType } from '@constants/enums';
import { PARTNER_DOCUMENT_REQUIREMENTS, labelForDocument } from '@constants/documentRequirements';
import type { PartnerStackParamList } from '@models/index';

type Nav   = NativeStackNavigationProp<PartnerStackParamList>;
type Route = RouteProp<PartnerStackParamList, 'PartnerAddDocument'>;

const STEPS = ['type', 'file', 'expiry', 'review'] as const;
type Step = typeof STEPS[number];

const NEEDS_EXPIRY = new Set<PartnerDocumentType>([
  'EXTRAIT_KBIS', 'AGREMENT_CNAPS_SOCIETE', 'AGREMENT_CNAPS_DIRIGEANT',
  'ATTESTATION_URSSAF', 'ATTESTATION_FISCALE', 'ATTESTATION_RC_PRO',
] as PartnerDocumentType[]);

const RETENTION_LABELS: Partial<Record<PartnerDocumentType, string>> = {
  EXTRAIT_KBIS:             '10 ans (art. L.123-22 C. com.)',
  AGREMENT_CNAPS_SOCIETE:   '5 ans',
  AGREMENT_CNAPS_DIRIGEANT: '5 ans',
  ATTESTATION_URSSAF:       '10 ans',
  ATTESTATION_FISCALE:      '10 ans',
  ATTESTATION_RC_PRO:       '5 ans',
  ATTESTATION_HONNEUR:      '5 ans',
  RIB:                      '10 ans (art. L.123-22 C. com.)',
  GRILLE_TARIFAIRE:         '5 ans',
  CONTRAT_CADRE:            '10 ans',
};

const ALL_TYPES: PartnerDocumentType[] = [
  ...PARTNER_DOCUMENT_REQUIREMENTS.mandatory as PartnerDocumentType[],
  ...PARTNER_DOCUMENT_REQUIREMENTS.optional  as PartnerDocumentType[],
];
const MANDATORY_SET = new Set<PartnerDocumentType>(PARTNER_DOCUMENT_REQUIREMENTS.mandatory as PartnerDocumentType[]);

export const PartnerAddDocumentScreen: React.FC = () => {
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const { t } = usePartnerT();
  const preselected = route.params?.preselectedType;

  const {
    phase, progress, error: uploadError,
    draft, setDraftField, pickFile: validateFile, upload, reset,
  } = useDocumentUpload({ namespace: 'company' });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [docType, setDocType]       = useState<PartnerDocumentType | undefined>(preselected);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

  const needsExpiry = docType ? NEEDS_EXPIRY.has(docType) : false;

  const activeSteps = useMemo<Step[]>(() => {
    const s: Step[] = ['type', 'file'];
    if (needsExpiry) s.push('expiry');
    s.push('review');
    return s;
  }, [needsExpiry]);

  const wizard = useWizardSteps<Step>(activeSteps);
  const { step, stepIndex, goNext, setStep } = wizard;

  const goBack = useCallback(() => {
    if (wizard.isFirst) navigation.goBack(); else wizard.goBack();
  }, [wizard, navigation]);

  const handlePickFile = useCallback(async () => {
    try {
      const [result] = await pick({ allowMultiSelection: false, allowVirtualFiles: false, mode: 'import', type: [types.pdf, types.images] });
      if (result.error) { showAlert(t('addDocument.errors.pickFailed'), `${result.error}`); return; }
      const name = result.name ?? `partner_doc_${Date.now()}`;
      const mime = result.type ?? 'application/pdf';
      const size = result.size ?? 0;
      const [copied] = await keepLocalCopy({ files: [{ uri: result.uri, fileName: name }], destination: 'cachesDirectory' });
      if (copied.status === 'error') { showAlert(t('addDocument.errors.pickFailed'), `${copied.copyError}`); return; }
      const ok = await validateFile(copied.localUri, name, mime, size);
      if (ok) { if (docType) setDraftField('documentType', docType); goNext(); }
    } catch (err: any) {
      if (!isErrorWithCode(err)) showAlert(t('addDocument.errors.pickFailed'), '');
    }
  }, [docType, goNext, validateFile, setDraftField, t]);

  const handleSubmit = useCallback(async () => {
    if (!docType)  { showAlert(t('common:errors.title'), t('addDocument.alerts.typeRequired.body'));  return; }
    if (!draft.fileUri) { showAlert(t('common:errors.title'), t('addDocument.alerts.fileRequired.body')); return; }
    if (needsExpiry && !expiryDate) { showAlert(t('addDocument.alerts.expiryRequired.title'), t('addDocument.alerts.expiryRequired.body')); return; }
    setSubmitting(true);
    try {
      const uploadedFile = await upload();
      if (!uploadedFile) { showAlert(t('common:errors.title'), uploadError ?? t('addDocument.errors.uploadFailed')); setSubmitting(false); return; }
      await partnerDocumentsApi.addDocument({
        type: docType, fileUrl: uploadedFile.url,
        objectName: uploadedFile.objectName || undefined,
        sha256:     uploadedFile.sha256     || undefined,
        expiresAt:  expiryDate ? expiryDate.toISOString() : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      showAlert(t('common:errors.title'), err?.response?.data?.message ?? t('addDocument.errors.uploadFailed'));
    } finally { setSubmitting(false); }
  }, [docType, draft.fileUri, needsExpiry, expiryDate, upload, uploadError, t]);

  /* Success view */
  if (submitted) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('addDocument.alerts.success.title')} onBack={() => navigation.goBack()} />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><CircleCheckBig size={48} color={colors.success} strokeWidth={1.6} /></View>
          <Text style={styles.successTitle}>{t('addDocument.alerts.success.title')}</Text>
          <Text style={styles.successBody}>{t('addDocument.alerts.success.body')}</Text>
          <Button label={t('addDocument.actions.submit')} onPress={() => navigation.navigate('PartnerCompliance')} fullWidth size="lg" style={{ marginTop: spacing[5] }} />
          <Button
            label={t('addDocument.title')}
            variant="ghost"
            onPress={() => { reset(); setDocType(undefined); setExpiryDate(undefined); setSubmitted(false); setStep('type'); }}
            fullWidth size="md"
            style={{ marginTop: spacing[2] }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('addDocument.title')}
        subtitle={`${t('addDocument.sections.selectType')} ${stepIndex + 1}/${activeSteps.length}`}
        onBack={goBack}
      />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((stepIndex + 1) / activeSteps.length) * 100}%` as any }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Step 1: Type */}
        {step === 'type' && (
          <View>
            <Text style={styles.stepTitle}>{t('addDocument.sections.selectType')}</Text>
            <Text style={styles.stepSubtitle}>{t('addDocument.subtitle')}</Text>
            <Text style={styles.groupLabel}>{t('compliance.sections.mandatory')}</Text>
            {ALL_TYPES.filter(tp => MANDATORY_SET.has(tp)).map(tp => (
              <TypeRow key={tp} type={tp} selected={docType === tp} mandatory onPress={() => setDocType(tp)} t={t} />
            ))}
            <Text style={[styles.groupLabel, { marginTop: spacing[4] }]}>{t('compliance.sections.optional')}</Text>
            {ALL_TYPES.filter(tp => !MANDATORY_SET.has(tp)).map(tp => (
              <TypeRow key={tp} type={tp} selected={docType === tp} mandatory={false} onPress={() => setDocType(tp)} t={t} />
            ))}
            <Button label={t('common:actions.continue')} onPress={goNext} disabled={!docType} fullWidth size="lg" style={{ marginTop: spacing[5] }} />
          </View>
        )}

        {/* Step 2: File */}
        {step === 'file' && (
          <View>
            <Text style={styles.stepTitle}>{t('addDocument.sections.uploadFile')}</Text>
            <Text style={styles.stepSubtitle}>{t('addDocument.upload.formats')}</Text>
            <TouchableOpacity style={styles.fileDropzone} onPress={handlePickFile} activeOpacity={0.78}>
              <Upload size={36} color={colors.primary} strokeWidth={1.6} />
              <Text style={styles.fileDropzoneTitle}>
                {draft.fileName ? draft.fileName : t('addDocument.upload.cta')}
              </Text>
              {draft.fileName && (
                <Text style={styles.fileDropzoneSub}>
                  {(draft.fileSizeBytes ?? 0) > 0 ? `${(draft.fileSizeBytes / 1024 / 1024).toFixed(2)} MB` : ''}
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.navRow}>
              <Button label={t('common:actions.back')} onPress={goBack} variant="ghost" size="md" style={{ flex: 1 }} />
              <Button label={t('common:actions.continue')} onPress={goNext} disabled={!draft.fileUri} fullWidth size="lg" style={{ flex: 2 }} />
            </View>
          </View>
        )}

        {/* Step 3: Expiry */}
        {step === 'expiry' && (
          <View>
            <Text style={styles.stepTitle}>{t('addDocument.steps.expiry')}</Text>
            <Text style={styles.stepSubtitle}>{t('addDocument.steps.expirySub')}</Text>
            <View style={styles.expiryCard}>
              <CalendarDays size={20} color={colors.primary} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiryLabel}>{t('addDocument.steps.selectedDate')}</Text>
                <Text style={styles.expiryValue}>{expiryDate ? labelDateShort(expiryDate) : t('addDocument.steps.notProvided')}</Text>
              </View>
            </View>
            <View style={styles.expiryShortcuts}>
              <Text style={styles.shortcutLabel}>{t('addDocument.steps.shortcuts')}</Text>
              <View style={styles.shortcutRow}>
                {[3, 6, 12, 24, 60].map(months => (
                  <TouchableOpacity key={months} style={styles.shortcutBtn}
                    onPress={() => { const d = new Date(); d.setMonth(d.getMonth() + months); setExpiryDate(d); }}
                    activeOpacity={0.78}>
                    <Text style={styles.shortcutText}>{months >= 12 ? t('addDocument.steps.years', { count: months / 12 }) : t('addDocument.steps.months', { count: months })}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.navRow}>
              <Button label={t('common:actions.back')} onPress={goBack} variant="ghost" size="md" style={{ flex: 1 }} />
              <Button label={t('common:actions.continue')} onPress={goNext} disabled={!expiryDate} fullWidth size="lg" style={{ flex: 2 }} />
            </View>
          </View>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <View>
            <Text style={styles.stepTitle}>{t('addDocument.steps.review')}</Text>
            <Text style={styles.stepSubtitle}>{t('addDocument.steps.reviewSub')}</Text>
            <View style={styles.summaryCard}>
              <SummaryRow icon={<Building2 size={16} color={colors.textMuted} strokeWidth={2} />} label={t('addDocument.steps.summary.type')} value={docType ? labelForDocument(docType) : '—'} />
              <SummaryRow icon={<FileIcon size={16} color={colors.textMuted} strokeWidth={2} />} label={t('addDocument.steps.summary.file')} value={draft.fileName ?? '—'} />
              {expiryDate && <SummaryRow icon={<CalendarDays size={16} color={colors.textMuted} strokeWidth={2} />} label={t('addDocument.steps.summary.expiration')} value={labelDateShort(expiryDate)} />}
              {docType && RETENTION_LABELS[docType] && <SummaryRow icon={<FileText size={16} color={colors.textMuted} strokeWidth={2} />} label={t('addDocument.steps.summary.retention')} value={RETENTION_LABELS[docType]} />}
            </View>
            {phase === 'uploading' && (
              <View style={styles.uploadProgress}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.uploadText}>{t('addDocument.steps.uploading', { progress: Math.round(progress) })}</Text>
              </View>
            )}
            {uploadError && (
              <View style={styles.errorBanner}>
                <TriangleAlert size={16} color={colors.danger} strokeWidth={2} />
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            )}
            <View style={styles.navRow}>
              <Button label={t('common:actions.back')} onPress={goBack} variant="ghost" size="md" style={{ flex: 1 }} disabled={submitting} />
              <Button
                label={submitting ? t('addDocument.actions.submitting') : t('addDocument.actions.submit')}
                onPress={handleSubmit}
                disabled={submitting || !docType || !draft.fileUri || (needsExpiry && !expiryDate)}
                fullWidth size="lg" style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const TypeRow: React.FC<{ type: PartnerDocumentType; selected: boolean; mandatory: boolean; onPress: () => void; t: any }> = ({ type, selected, mandatory, onPress, t }) => {
  const label = labelForDocument(type);
  const desc  = MANDATORY_DOC_DESC[type]   ?? '';
  return (
    <TouchableOpacity style={[styles.typeRow, selected && styles.typeRowSelected]} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.typeRadio, selected && styles.typeRadioActive]}>
        {selected && <CircleCheckBig size={14} color="#fff" strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.typeRowHeader}>
          <Text style={[styles.typeName, selected && styles.typeNameActive]}>{label}</Text>
          {!mandatory && (
            <View style={styles.optionalChip}>
              <Text style={styles.optionalChipText}>{t('compliance.docStatus.optional')}</Text>
            </View>
          )}
        </View>
        {desc && <Text style={styles.typeDesc} numberOfLines={2}>{desc}</Text>}
      </View>
      <ChevronRight size={16} color={palette.white30} strokeWidth={2} />
    </TouchableOpacity>
  );
};

const SummaryRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.summaryRow}>
    {icon}
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: colors.background },
  content:       { padding: layout.screenPaddingH, paddingBottom: 80 },
  progressTrack: { height: 3, backgroundColor: palette.white05 },
  progressFill:  { height: 3, backgroundColor: colors.primary },
  stepTitle:     { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, marginBottom: 4 },
  stepSubtitle:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing[5] },
  groupLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing[2] },
  typeRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], marginBottom: spacing[2], borderRadius: radius.lg, backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10 },
  typeRowSelected: { borderColor: colors.primary, borderWidth: 2 },
  typeRadio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.white30, alignItems: 'center', justifyContent: 'center' },
  typeRadioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeRowHeader:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 2 },
  typeName:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  typeNameActive:  { color: colors.primary },
  typeDesc:        { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  optionalChip:     { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: palette.white10, borderRadius: 4 },
  optionalChipText: { fontFamily: fontFamily.body, fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fileDropzone: { alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[8], borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.white30, backgroundColor: palette.white05, marginBottom: spacing[5] },
  fileDropzoneTitle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, textAlign: 'center' },
  fileDropzoneSub:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  expiryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10, marginBottom: spacing[4] },
  expiryLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  expiryValue: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.md, color: colors.textPrimary, marginTop: 2 },
  expiryShortcuts: { marginBottom: spacing[5] },
  shortcutLabel:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing[2] },
  shortcutRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  shortcutBtn:     { paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10 },
  shortcutText:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textPrimary },
  summaryCard: { padding: spacing[4], borderRadius: radius.lg, backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10, marginBottom: spacing[4], gap: spacing[3] },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  summaryLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, width: 100 },
  summaryValue: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  uploadProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderRadius: radius.lg, backgroundColor: colors.primarySurface, marginBottom: spacing[3] },
  uploadText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.primary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.lg, backgroundColor: colors.dangerSurface, borderWidth: 1, borderColor: colors.danger + '60', marginBottom: spacing[3] },
  errorText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger, flex: 1 },
  navRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[3] },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSurface },
  successTitle: { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, textAlign: 'center' },
  successBody:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: fontSize.sm * 1.5 },
});
