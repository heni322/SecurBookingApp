/**
 * PaymentHistoryScreen — full payment list with invoice download.
 * Premium UI: grouped by month, status badges, PDF tap-to-open.
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, RefreshControl, Linking, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CreditCard, Download, CheckCircle, Clock, XCircle, Receipt,
} from 'lucide-react-native';
import { paymentsApi }        from '@api/endpoints/payments';
import { useApi }             from '@hooks/useApi';
import { ScreenHeader }       from '@components/ui/ScreenHeader';
import { EmptyState }         from '@components/ui/EmptyState';
import { PaymentListSkeleton } from '@components/ui/SkeletonLoader';
import { colors, palette }    from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros, formatDate, formatDateShort } from '@utils/formatters';
import { PaymentStatus }      from '@constants/enums';
import type { Payment, ProfileStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PaymentHistory'>;

// ─── Group payments by month ──────────────────────────────────────────────────
function groupByMonth(payments: Payment[]) {
  const map = new Map<string, Payment[]>();
  const list = Array.isArray(payments) ? payments : [];
  for (const p of list) {
    const d     = new Date(p.createdAt);
    const key   = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

const STATUS_META: Record<string, { label: string; color: string; Icon: any }> = {
  [PaymentStatus.PAID]:     { label: 'Paid',    color: colors.success, Icon: CheckCircle },
  [PaymentStatus.PENDING]:  { label: 'Pending', color: colors.warning, Icon: Clock },
  [PaymentStatus.FAILED]:   { label: 'Failed',  color: colors.danger,  Icon: XCircle },
  [PaymentStatus.REFUNDED]: { label: 'Refunded', color: colors.info,  Icon: Receipt },
};

export const PaymentHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { data: payments, loading, execute } = useApi(paymentsApi.getMyPayments);
    const { t } = useTranslation('payment');
  
  useEffect(() => { execute(); }, [execute]);

  const sections = useMemo(
    () => groupByMonth(Array.isArray(payments) ? payments : []),
    [payments],
  );

  const totalSpent = useMemo(
    () => (payments ?? [])
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((acc, p) => acc + p.amount, 0),
    [payments],
  );

  const handleDownload = useCallback(async (p: Payment) => {
    if (p.invoicePdfUrl) {
      await Linking.openURL(p.invoicePdfUrl);
      return;
    }
    try {
      const { data: res } = await paymentsApi.getInvoiceUrl(p.id);
      const url = (res as any).data?.url ?? (res as any).url;
      if (url) await Linking.openURL(url);
      else Alert.alert('Invoice', 'Invoice not available for this payment.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la facture.');
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: Payment }) => {
    const meta   = STATUS_META[item.status] ?? STATUS_META[PaymentStatus.PENDING];
    const isPaid = item.status === PaymentStatus.PAID;

    return (
      <View style={rowStyles.row}>
        {/* Icon */}
        <View style={[rowStyles.iconBox, { backgroundColor: meta.color + '18' }]}>
          <CreditCard size={16} color={meta.color} strokeWidth={1.8} />
        </View>

        {/* Info */}
        <View style={rowStyles.info}>
          <Text style={rowStyles.invoice} numberOfLines={1}>
            {item.invoiceNumber || `Paiement #${item.id.slice(0, 8)}`}
          </Text>
          <Text style={rowStyles.date}>
            {item.mission?.city
              ? `${item.mission.city} · ${formatDateShort(item.paidAt ?? item.createdAt)}`
              : formatDateShort(item.paidAt ?? item.createdAt)}
          </Text>
          {/* Status badge */}
          <View style={[rowStyles.badge, { backgroundColor: meta.color + '18' }]}>
            <meta.Icon size={10} color={meta.color} strokeWidth={2} />
            <Text style={[rowStyles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Amount + Download */}
        <View style={rowStyles.right}>
          <Text style={[rowStyles.amount, isPaid && rowStyles.amountPaid]}>
            {formatEuros(item.amount)}
          </Text>
          {isPaid && (
            <TouchableOpacity
              style={rowStyles.dlBtn}
              onPress={() => handleDownload(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Download size={13} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [handleDownload]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("history.title")} onBack={() => navigation.goBack()} />

      {/* Total card */}
      {(payments?.length ?? 0) > 0 && (
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>TOTAL DÉPENSÉ</Text>
            <Text style={styles.totalAmount}>{formatEuros(totalSpent)}</Text>
          </View>
          <Text style={styles.totalCount}>
            {(payments ?? []).filter(p => p.status === PaymentStatus.PAID).length} facture
            {(payments ?? []).filter(p => p.status === PaymentStatus.PAID).length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* List */}
      {loading && !payments ? (
        <View style={styles.skeletonWrap}>
          <PaymentListSkeleton count={6} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={execute} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              Icon={Receipt}
              title={t("history.title")}
              subtitle={t("history.empty_subtitle")}
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

// ─── Row styles ───────────────────────────────────────────────────────────────
const rowStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   spacing[3] + 2,
    paddingHorizontal: layout.screenPaddingH,
    gap:               spacing[3],
    backgroundColor:   colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBox: {
    width:          40,
    height:         40,
    borderRadius:   radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  info:    { flex: 1, gap: 3 },
  invoice: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  date:    { fontFamily: fontFamily.body,        fontSize: fontSize.xs, color: colors.textMuted },
  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    alignSelf:         'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical:   2,
    borderRadius:      radius.full,
    marginTop:         2,
  },
  badgeText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10 },
  right:  { alignItems: 'flex-end', gap: spacing[2] },
  amount: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize.base,
    color:      colors.textSecondary,
    letterSpacing: -0.3,
  },
  amountPaid: { color: colors.textPrimary },
  dlBtn: {
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: colors.primarySurface,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
});

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  totalCard: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  layout.screenPaddingH,
    marginVertical:    spacing[4],
    padding:           spacing[4],
    backgroundColor:   colors.primarySurface,
    borderRadius:      radius.xl,
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
  },
  totalLabel: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      10,
    color:         colors.primary,
    letterSpacing: 0.8,
    marginBottom:  spacing[1],
  },
  totalAmount: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.5,
  },
  totalCount: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  skeletonWrap: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4] },
  list: { paddingBottom: spacing[12], flexGrow: 1 },
  sectionHeader: {
    backgroundColor:  colors.background,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[2] + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      10,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
});
