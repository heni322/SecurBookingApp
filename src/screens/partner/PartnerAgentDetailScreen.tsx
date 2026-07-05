/**
 * PartnerAgentDetailScreen — Profil complet d'un agent côté partenaire.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CircleCheckBig, Clock, XCircle, TriangleAlert, FileText,
} from 'lucide-react-native';
import { partnerApi }    from '@api/endpoints/partner';
import { ScreenHeader }  from '@components/ui/ScreenHeader';
import { Card }          from '@components/ui/Card';
import { Badge }         from '@components/ui/Badge';
import { LoadingState }  from '@components/ui/LoadingState';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { labelForDocument } from '@constants/documentRequirements';
import type { PartnerOnboarding, PartnerStackParamList } from '@models/index';

type Props = NativeStackScreenProps<PartnerStackParamList, 'PartnerAgentDetail'>;

export const PartnerAgentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { agentId, agentName } = route.params;
  const { t } = usePartnerT();
  const [data,       setData]       = useState<PartnerOnboarding | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await partnerApi.getAgentOnboarding(agentId);
      setData((res.data as any)?.data ?? res.data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <LoadingState message={t('agentDetail.loading')} />;

  const pct       = data?.onboarding.progress ?? 0;
  const isValid   = data?.isValidated ?? false;
  const missing   = data?.onboarding.missingMandatory ?? [];
  const documents = data?.documents ?? [];

  const statusColor = (s: string) => ({ APPROVED: colors.success, PENDING: colors.warning, REJECTED: colors.danger, EXPIRED: colors.danger }[s] ?? colors.textMuted);
  const statusLabel = (s: string) => t(`agentDetail.docs.status.${s.toLowerCase()}` as any, { defaultValue: s });

  return (
    <View style={styles.screen}>
      <ScreenHeader title={agentName} subtitle={t('agentDetail.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* Status hero */}
        <View style={[styles.statusBanner, isValid && styles.statusBannerOk]}>
          <View style={[styles.statusIcon, { backgroundColor: isValid ? colors.successSurface : colors.warningSurface }]}>
            {isValid
              ? <CircleCheckBig size={28} color={colors.success} strokeWidth={1.5} />
              : <Clock        size={28} color={colors.warning} strokeWidth={1.5} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: isValid ? colors.success : colors.warning }]}>
              {isValid ? t('agentDetail.pills.cnapsValidated') : t('agentDetail.pills.cnapsNotValidated')}
            </Text>
            <Text style={styles.statusSub}>{data?.fullName} · {data?.email}</Text>
          </View>
        </View>

        {/* Progress */}
        <Card>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{t('agentDetail.onboarding.title')}</Text>
            <Text style={styles.progressPct}>{pct} %</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${pct}%` as any, backgroundColor: pct === 100 ? colors.success : colors.primary }]} />
          </View>
          <Text style={styles.progressSub}>
            {data?.onboarding.approvedDocs ?? 0} {t('agentDetail.docs.status.approved')} ·{' '}
            {data?.onboarding.pendingDocs  ?? 0} {t('agentDetail.docs.status.pending')} ·{' '}
            {data?.onboarding.rejectedDocs ?? 0} {t('agentDetail.docs.status.rejected')}
          </Text>
        </Card>

        {/* Missing mandatory */}
        {missing.length > 0 && (
          <View style={styles.missingCard}>
            <View style={styles.missingHeader}>
              <TriangleAlert size={15} color={colors.warning} strokeWidth={2} />
              <Text style={styles.missingTitle}>
                {t('team.alerts.missing', { count: missing.length })}
              </Text>
            </View>
            {missing.map(m => (
              <Text key={m} style={styles.missingItem}>· {labelForDocument(m)}</Text>
            ))}
          </View>
        )}

        {/* Documents */}
        <Text style={styles.sectionTitle}>{t('agentDetail.sections.documents')}</Text>
        {documents.length === 0 ? (
          <Card><Text style={styles.emptyText}>{t('agentDetail.docs.empty')}</Text></Card>
        ) : (
          documents.map((doc, i) => {
            const color = statusColor(doc.status);
            const label = statusLabel(doc.status);
            return (
              <Card key={i} style={styles.docCard}>
                <View style={styles.docRow}>
                  <View style={[styles.docIconWrap, { backgroundColor: color + '18' }]}>
                    {doc.status === 'APPROVED' ? <CircleCheckBig size={16} color={color} strokeWidth={2} />
                      : doc.status === 'REJECTED' ? <XCircle size={16} color={color} strokeWidth={2} />
                      : <Clock size={16} color={color} strokeWidth={2} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docType}>{labelForDocument(doc.type)}</Text>
                    <Badge label={label} color={color} bg={color + '18'} />
                  </View>
                </View>
                {doc.rejectionNote && (
                  <View style={styles.rejectNote}>
                    <XCircle size={12} color={colors.danger} strokeWidth={2} />
                    <Text style={styles.rejectText}>{doc.rejectionNote}</Text>
                  </View>
                )}
              </Card>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  statusBanner:    { flexDirection: 'row', alignItems: 'center', gap: spacing[4], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.warning + '40', backgroundColor: colors.warningSurface, padding: spacing[4] },
  statusBannerOk:  { borderColor: colors.success + '40', backgroundColor: colors.successSurface },
  statusIcon:      { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  statusTitle:     { fontFamily: fontFamily.display, fontSize: fontSize.base, letterSpacing: -0.2 },
  statusSub:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  progressLabel:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  progressPct:    { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary },
  progressTrack:  { height: 8, borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden' },
  progressBar:    { height: '100%', borderRadius: radius.full },
  progressSub:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing[2] },
  missingCard:   { backgroundColor: colors.warningSurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.warning + '40', gap: spacing[2] },
  missingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  missingTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.warning },
  missingItem:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing[4] },
  sectionTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  docCard:     { gap: spacing[2] },
  docRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  docIconWrap: { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  docType:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary, marginBottom: spacing[1] },
  rejectNote:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: colors.dangerSurface, borderRadius: radius.lg, padding: spacing[3] },
  rejectText:  { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, lineHeight: fontSize.xs * 1.5 },
  emptyText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[4] },
});
