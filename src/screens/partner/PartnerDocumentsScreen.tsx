/**
 * PartnerDocumentsScreen — Liste des documents légaux de la société partenaire.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity,
  StyleSheet, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CircleCheckBig, Clock, XCircle, FolderOpen,
  TriangleAlert, FileX, Plus, RotateCcw, FileText, Building2,
} from 'lucide-react-native';
import { partnerDocumentsApi } from '@api/endpoints/partnerDocuments';
import { LoadingState }        from '@components/ui/LoadingState';
import { EmptyState }          from '@components/ui/EmptyState';
import { ScreenHeader }        from '@components/ui/ScreenHeader';
import { showAlert }           from '@components/ui/AlertModal';
import { socketService }       from '@services/socketService';
import { colors, palette }     from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDateShort }         from '@utils/formatters';
import { DOCUMENT_STATUS_COLOR } from '@utils/statusHelpers';
import { labelForDocument } from '@constants/documentRequirements';
import type { PartnerDocument, PartnerStackParamList } from '@models/index';
import type { PartnerDocumentType } from '@constants/enums';

type Nav = NativeStackNavigationProp<PartnerStackParamList>;
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
};

export const PartnerDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();
  const [docs, setDocs]            = useState<PartnerDocument[]>([]);
  const [loading, setLoading]      = useState(true);
  const [refreshing, setRefreshing]= useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await partnerDocumentsApi.getMyDocuments();
      const data = (res.data as any)?.data ?? res.data ?? [];
      setDocs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showAlert(t('documents.errors.openFailedTitle'), err?.response?.data?.message ?? t('documents.errors.openFailedBody'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubscribe = socketService.onPartnerDocumentReview(() => load());
    return unsubscribe;
  }, [load]);

  const approved = docs.filter(d => d.status === 'APPROVED').length;
  const pending  = docs.filter(d => d.status === 'PENDING').length;
  const rejected = docs.filter(d => d.status === 'REJECTED').length;

  const expiringSoon = docs.filter(d => {
    if (d.status !== 'APPROVED' || !d.expiresAt) return false;
    const days = daysUntil(d.expiresAt);
    return days !== null && days >= 0 && days <= 30;
  });

  const openFile = async (doc: PartnerDocument) => {
    try {
      const { data: res } = await partnerDocumentsApi.getFileUrl(doc.id);
      const url = res?.data?.url;
      if (!url) throw new Error(t('documents.errors.urlMissing'));
      await Linking.openURL(url);
    } catch (err: any) {
      if (doc.fileUrl) {
        try { await Linking.openURL(doc.fileUrl); return; } catch { /* drop through */ }
      }
      showAlert(t('documents.errors.openFailedTitle'), err?.response?.data?.message ?? t('documents.errors.openFailedBody'));
    }
  };

  const handleDocumentPress = (doc: PartnerDocument) => {
    const isApproved = doc.status === 'APPROVED';
    const actions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      { text: t('documents.actions.view'), onPress: () => openFile(doc) },
    ];
    if (!isApproved) {
      actions.push(
        { text: t('documents.actions.replace'), onPress: () => navigation.navigate('PartnerAddDocument', { preselectedType: doc.type as PartnerDocumentType }) },
        { text: t('documents.actions.delete'), style: 'destructive', onPress: () => handleDelete(doc.id) },
      );
    }
    actions.push({ text: 'Annuler', style: 'cancel' });
    showAlert(
      labelForDocument(doc.type),
      isApproved ? t('documents.alerts.approvedBody') : t('documents.alerts.notApprovedBody'),
      actions,
    );
  };

  const handleDelete = (id: string) => {
    showAlert(
      t('documents.alerts.delete.title'),
      t('documents.alerts.delete.body'),
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: t('documents.actions.delete'), style: 'destructive',
          onPress: async () => {
            try { await partnerDocumentsApi.deleteDocument(id); await load(true); }
            catch (err: any) { showAlert(t('common:errors.title'), err?.response?.data?.message ?? t('documents.errors.deleteFailed')); }
          },
        },
      ],
    );
  };

  const docStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING:  t('compliance.docStatus.pending'),
      APPROVED: t('compliance.docStatus.approved'),
      REJECTED: t('compliance.docStatus.rejected'),
      EXPIRED:  t('compliance.docStatus.missing'),
    };
    return map[status] ?? status;
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('PartnerAddDocument')} activeOpacity={0.8}>
            <Plus size={14} color={colors.textInverse} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>{t('documents.addButton')}</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.statsRow}>
        <StatPill Icon={CircleCheckBig} count={approved}    label={t('documents.stats.approved')} color={colors.success} bg={colors.successSurface} />
        <StatPill Icon={Clock}        count={pending}     label={t('documents.stats.pending')}  color={colors.warning} bg={colors.warningSurface} />
        <StatPill Icon={XCircle}      count={rejected}    label={t('documents.stats.rejected')} color={colors.danger}  bg={colors.dangerSurface} />
        <StatPill Icon={FolderOpen}   count={docs.length} label={t('documents.stats.total')}    color={colors.primary} bg={colors.primarySurface} />
      </View>

      {expiringSoon.map(doc => {
        const days = daysUntil(doc.expiresAt);
        return (
          <View key={doc.id} style={[styles.banner, styles.bannerWarn]}>
            <View style={[styles.bannerIconWrap, { backgroundColor: palette.amberDim }]}>
              <TriangleAlert size={16} color={palette.gold} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{t('documents.expiringBanner.title', { type: labelForDocument(doc.type) })}</Text>
              <Text style={styles.bannerBody}>
                {days === 0
                  ? t('documents.expiringBanner.today')
                  : t(days === 1 ? 'documents.expiringBanner.inDays_one' : 'documents.expiringBanner.inDays_other', { count: days, date: formatDateShort(doc.expiresAt) })}
              </Text>
            </View>
            <TouchableOpacity style={styles.bannerBtn} onPress={() => navigation.navigate('PartnerAddDocument', { preselectedType: doc.type as PartnerDocumentType })} activeOpacity={0.8}>
              <RotateCcw size={13} color={palette.gold} strokeWidth={2.5} />
              <Text style={styles.bannerBtnTxt}>{t('documents.expiringBanner.renew')}</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {rejected > 0 && (
        <View style={[styles.banner, styles.bannerDanger]}>
          <View style={[styles.bannerIconWrap, { backgroundColor: colors.dangerSurface }]}>
            <FileX size={16} color={colors.danger} strokeWidth={2} />
          </View>
          <Text style={[styles.bannerBody, { flex: 1, color: colors.danger }]}>
            {t(rejected === 1 ? 'agent:documents.rejectedBanner_one' : 'agent:documents.rejectedBanner_other', { count: rejected })}
          </Text>
        </View>
      )}

      {loading && docs.length === 0 ? (
        <LoadingState message={t('documents.loading')} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ListHeaderComponent={docs.length > 0 ? (
            <Text style={styles.countLabel}>
              {t(docs.length === 1 ? 'documents.countLabel_one' : 'documents.countLabel_other', { count: docs.length })}
            </Text>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              Icon={Building2}
              title={t('documents.empty.title')}
              subtitle={t('documents.empty.subtitle')}
              actionLabel={t('documents.empty.action')}
              onAction={() => navigation.navigate('PartnerAddDocument')}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.docCard, item.status === 'APPROVED' && styles.docCardApproved]}
              onPress={() => handleDocumentPress(item)}
              activeOpacity={0.78}
            >
              <View style={styles.docCardLeft}>
                <View style={[styles.docTypeBadge, { backgroundColor: (DOCUMENT_STATUS_COLOR[item.status] ?? colors.textMuted) + '22' }]}>
                  <FileText size={18} color={DOCUMENT_STATUS_COLOR[item.status] ?? colors.textMuted} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle}>{labelForDocument(item.type)}</Text>
                  <Text style={styles.docSub}>
                    {docStatusLabel(item.status)}
                    {item.expiresAt && ` · expire le ${formatDateShort(item.expiresAt)}`}
                  </Text>
                  {item.rejectionNote && (
                    <Text style={styles.docNote} numberOfLines={2}>{item.rejectionNote}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const StatPill: React.FC<{ Icon: LucideIcon; count: number; label: string; color: string; bg: string }> = ({ Icon, count, label, color, bg }) => (
  <View style={[statStyles.pill, { borderColor: color + '40', backgroundColor: bg }]}>
    <Icon size={15} color={color} strokeWidth={2} />
    <Text style={[statStyles.count, { color }]}>{count}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  pill:  { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, gap: 3 },
  count: { fontFamily: fontFamily.display, fontSize: fontSize.xl, letterSpacing: -0.5 },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
});

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  addBtnText:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textInverse },
  statsRow:  { flexDirection: 'row', gap: spacing[2], paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[4] },
  banner:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginHorizontal: layout.screenPaddingH, marginBottom: spacing[3], borderRadius: radius.lg, padding: spacing[4], borderWidth: 1 },
  bannerWarn:   { backgroundColor: palette.amberDim + '30', borderColor: palette.gold + '60' },
  bannerDanger: { backgroundColor: colors.dangerSurface, borderColor: colors.danger + '60' },
  bannerIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bannerTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: palette.gold, marginBottom: 2 },
  bannerBody:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.5 },
  bannerBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1], borderRadius: radius.lg, borderWidth: 1, borderColor: palette.gold + '80', paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexShrink: 0 },
  bannerBtnTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.gold },
  list:         { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[10], flexGrow: 1 },
  countLabel:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing[3], marginTop: spacing[2] },
  docCard:      { backgroundColor: palette.white05, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.white10, padding: spacing[3], marginBottom: spacing[2] },
  docCardApproved: { borderColor: colors.success + '40' },
  docCardLeft:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  docTypeBadge: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  docTitle:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary, marginBottom: 2 },
  docSub:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  docNote:      { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
});
