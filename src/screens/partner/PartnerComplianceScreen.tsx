/**
 * PartnerComplianceScreen — Statut de conformité société partenaire.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Linking,
} from 'react-native';
import { usePartnerT } from './_partnerI18n';
import {
  ShieldAlert, CircleCheckBig, Clock, XCircle, TriangleAlert,
  FileText, RefreshCw, Lock, Building2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { partnerDocumentsApi } from '@api/endpoints/partnerDocuments';
import { colors, palette }     from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import {
  MANDATORY_DOC_DESC, COMPLIANCE_STATUS_COLOR,
} from '@utils/statusHelpers';
import { labelForDocument } from '@constants/documentRequirements';
import type { PartnerComplianceStatus, ComplianceDocItem, PartnerStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<PartnerStackParamList>;
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 18 }) => {
  const color = COMPLIANCE_STATUS_COLOR[status] ?? palette.white30;
  if (status === 'APPROVED') return <CircleCheckBig  size={size} color={color} strokeWidth={2} />;
  if (status === 'PENDING')  return <Clock         size={size} color={color} strokeWidth={2} />;
  if (status === 'REJECTED') return <XCircle       size={size} color={color} strokeWidth={2} />;
  if (status === 'EXPIRED')  return <TriangleAlert size={size} color={color} strokeWidth={2} />;
  return <FileText size={size} color={color} strokeWidth={1.8} />;
};

export const PartnerComplianceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();
  const [compliance, setCompliance] = useState<PartnerComplianceStatus | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await partnerDocumentsApi.getComplianceStatus();
      setCompliance((res.data as any)?.data ?? res.data);
    } catch { /* show error UI */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const progress   = compliance?.progress;
  const pct        = progress && progress.total > 0 ? Math.round((progress.approved / progress.total) * 100) : 0;
  const hasPending = (progress?.pending  ?? 0) > 0;
  const hasReject  = (progress?.rejected ?? 0) > 0;

  const headerStatus = hasReject
    ? { icon: XCircle,      color: colors.danger,  text: t('compliance.status.rejected'),   bg: colors.dangerSurface  }
    : hasPending
    ? { icon: Clock,        color: colors.warning, text: t('compliance.status.pending'),    bg: colors.warningSurface }
    : pct === 100
    ? { icon: CircleCheckBig, color: colors.success, text: t('compliance.status.compliant'),  bg: colors.successSurface }
    : { icon: ShieldAlert,  color: colors.primary, text: t('compliance.status.incomplete'), bg: colors.primarySurface };

  const HeaderIcon = headerStatus.icon as LucideIcon;

  const docStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      APPROVED: t('compliance.docStatus.approved'),
      PENDING:  t('compliance.docStatus.pending'),
      REJECTED: t('compliance.docStatus.rejected'),
      EXPIRED:  t('compliance.docStatus.missing'),
    };
    return map[status] ?? t('compliance.docStatus.missing');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: headerStatus.bg }]}>
          <View style={[styles.heroIconWrap, { borderColor: headerStatus.color + '60' }]}>
            <HeaderIcon size={36} color={headerStatus.color} strokeWidth={1.6} />
          </View>
          <Text style={styles.heroTitle}>{t('compliance.title')}</Text>
          <Text style={[styles.heroStatus, { color: headerStatus.color }]}>{headerStatus.text}</Text>
          {compliance?.companyName && (
            <View style={styles.companyChip}>
              <Building2 size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.companyChipText}>{compliance.companyName}</Text>
              {compliance.siret && <Text style={styles.companyChipSub}> · SIRET {compliance.siret}</Text>}
            </View>
          )}
          <Text style={styles.heroBody}>{t('compliance.hero.source')}</Text>
        </View>

        {/* Progress */}
        {progress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{t('compliance.progress.title')}</Text>
              <Text style={[styles.progressPct, { color: pct === 100 ? colors.success : colors.primary }]}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: pct === 100 ? colors.success : colors.primary }]} />
            </View>
            <View style={styles.progressStats}>
              <ProgressStat value={progress.approved} label={t('compliance.progress.approved')} color={colors.success} />
              <ProgressStat value={progress.pending}  label={t('compliance.progress.pending')}  color={colors.warning} />
              <ProgressStat value={progress.rejected} label={t('compliance.progress.rejected')} color={colors.danger} />
              <ProgressStat value={progress.missing}  label={t('compliance.progress.missing')}  color={colors.textMuted} />
            </View>
          </View>
        )}

        {/* Mandatory docs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('compliance.sections.mandatory')}</Text>
          {loading && !compliance ? (
            <View style={styles.loadingRow}>{[1,2,3,4,5,6].map(i => <View key={i} style={styles.skeleton} />)}</View>
          ) : (
            compliance?.mandatory.map(doc => (
              <DocRow key={doc.type} doc={doc} statusLabel={docStatusLabel(doc.status)} t={t}
                onPress={() => {
                  if (doc.status === 'APPROVED') return;
                  navigation.navigate('PartnerAddDocument', { preselectedType: doc.type as any });
                }}
              />
            ))
          )}
        </View>

        {/* Optional docs */}
        {compliance?.optional && compliance.optional.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('compliance.sections.optional')}</Text>
            <Text style={styles.sectionSubtitle}>{t('compliance.sections.optionalSubtitle')}</Text>
            {compliance.optional.map(doc => (
              <DocRow key={doc.type} doc={doc} statusLabel={docStatusLabel(doc.status)} t={t}
                onPress={() => {
                  if (doc.status === 'APPROVED') return;
                  navigation.navigate('PartnerAddDocument', { preselectedType: doc.type as any });
                }}
              />
            ))}
          </View>
        )}

        {/* Reject alert */}
        {hasReject && (
          <View style={styles.alertBanner}>
            <XCircle size={18} color={colors.danger} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{t('compliance.alert.title')}</Text>
              <Text style={styles.alertBody}>
                {t(progress!.rejected === 1 ? 'compliance.alert.body_one' : 'compliance.alert.body_other', { count: progress!.rejected })}
              </Text>
            </View>
          </View>
        )}

        {/* RGPD */}
        {compliance?.rgpdNotice && (
          <View style={styles.rgpdCard}>
            <View style={styles.infoRow}>
              <Lock size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.rgpdTitle}>{t('compliance.rgpd.title')}</Text>
            </View>
            <Text style={styles.rgpdText}>{compliance.rgpdNotice.legalBasis}</Text>
            <Text style={styles.rgpdText}>{t('compliance.rgpd.retention', { policy: compliance.rgpdNotice.retentionPolicy })}</Text>
            <TouchableOpacity style={styles.rgpdLink} onPress={() => Linking.openURL('mailto:dpo@provalk.fr')}>
              <Text style={styles.rgpdLinkText}>{t('compliance.rgpd.contactDpo', { controller: compliance.rgpdNotice.controller })}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => load(true)}>
            <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.refreshBtnText}>{t('compliance.actions.checkStatus')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('PartnerAddDocument')}>
        <FileText size={22} color={colors.textInverse} strokeWidth={2} />
        <Text style={styles.fabText}>{t('compliance.actions.addDocument')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const DocRow: React.FC<{ doc: ComplianceDocItem; statusLabel: string; t: any; onPress: () => void }> = ({ doc, statusLabel, t, onPress }) => {
  const statusColor = COMPLIANCE_STATUS_COLOR[doc.status] ?? palette.white30;
  const isApproved  = doc.status === 'APPROVED';
  const label       = labelForDocument(doc.type);
  const desc        = MANDATORY_DOC_DESC[doc.type] ?? '';
  return (
    <TouchableOpacity style={[styles.docRow, isApproved && styles.docRowApproved]} onPress={onPress} activeOpacity={isApproved ? 1 : 0.75}>
      <StatusIcon status={doc.status} size={20} />
      <View style={styles.docInfo}>
        <View style={styles.docNameRow}>
          <Text style={styles.docName}>{label}</Text>
          {!doc.isMandatory && (
            <View style={styles.optionalChip}><Text style={styles.optionalChipText}>{t('compliance.docStatus.optional')}</Text></View>
          )}
        </View>
        {desc && <Text style={styles.docDesc} numberOfLines={2}>{desc}</Text>}
        {doc.rejectionNote && <Text style={styles.docReject} numberOfLines={2}>{t('compliance.rejectionNote', { note: doc.rejectionNote })}</Text>}
      </View>
      <Text style={[styles.docStatus, { color: statusColor }]}>{statusLabel}</Text>
    </TouchableOpacity>
  );
};

const ProgressStat: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.progressStat}>
    <Text style={[styles.progressStatValue, { color }]}>{value}</Text>
    <Text style={styles.progressStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 96 },
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 24, paddingHorizontal: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  heroTitle:  { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary },
  heroStatus: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.md },
  heroBody:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: fontSize.sm * 1.5 },
  companyChip: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[1], backgroundColor: palette.white05, borderRadius: radius.full },
  companyChipText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textPrimary },
  companyChipSub:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  progressSection: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[5] },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing[2] },
  progressTitle:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  progressPct:     { fontFamily: fontFamily.display, fontSize: fontSize.xl, letterSpacing: -0.5 },
  progressTrack:   { height: 8, backgroundColor: palette.white05, borderRadius: 4, overflow: 'hidden' },
  progressFill:    { height: 8, borderRadius: 4 },
  progressStats:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[3] },
  progressStat:    { alignItems: 'center', flex: 1 },
  progressStatValue:{ fontFamily: fontFamily.display, fontSize: fontSize.lg, letterSpacing: -0.3 },
  progressStatLabel:{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  section:         { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[5] },
  sectionTitle:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: spacing[3] },
  sectionSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing[2], marginBottom: spacing[3] },
  loadingRow: { gap: spacing[2] },
  skeleton:   { height: 64, backgroundColor: palette.white05, borderRadius: radius.lg },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: palette.white05, borderRadius: radius.lg, padding: spacing[3], marginBottom: spacing[2], borderWidth: 1, borderColor: palette.white10 },
  docRowApproved: { borderColor: colors.success + '40' },
  docInfo:        { flex: 1 },
  docNameRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  docName:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  docDesc:        { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  docReject:      { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
  docStatus:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
  optionalChip:     { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: palette.white10, borderRadius: 4 },
  optionalChipText: { fontFamily: fontFamily.body, fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginHorizontal: layout.screenPaddingH, marginTop: spacing[4], padding: spacing[4], borderRadius: radius.lg, backgroundColor: colors.dangerSurface, borderWidth: 1, borderColor: colors.danger + '60' },
  alertTitle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.danger, marginBottom: 2 },
  alertBody:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger, lineHeight: fontSize.sm * 1.4 },
  rgpdCard: { marginHorizontal: layout.screenPaddingH, marginTop: spacing[4], padding: spacing[3], borderRadius: radius.lg, backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10 },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  rgpdTitle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  rgpdText:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.5, marginBottom: 4 },
  rgpdLink:  { marginTop: spacing[2] },
  rgpdLinkText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  actions:    { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[5], gap: spacing[3] },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary },
  refreshBtnText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radius.full, backgroundColor: colors.primary },
  fabText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.md, color: colors.textInverse },
});
