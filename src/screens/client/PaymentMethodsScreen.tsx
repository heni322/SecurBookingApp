/**
 * PaymentMethodsScreen — manage saved cards & SEPA mandates.
 * Lists Stripe payment methods, allows deletion with confirmation.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CreditCard, Landmark, Trash2, Plus, ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { paymentsApi }       from '@api/endpoints/payments';
import { useApi }            from '@hooks/useApi';
import { ScreenHeader }      from '@components/ui/ScreenHeader';
import { EmptyState }        from '@components/ui/EmptyState';
import { Card }              from '@components/ui/Card';
import { PaymentListSkeleton } from '@components/ui/SkeletonLoader';
import { colors, palette }   from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { PaymentMethod, ProfileStackParamList } from '@models/index';
import { useTranslation } from '@i18n';
import { useToast } from '@hooks/useToast';
import { useConfirmDialogStore } from '@store/confirmDialogStore';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PaymentMethods'>;

// ── Card brand colors ─────────────────────────────────────────────────────────
const BRAND_COLOR: Record<string, string> = {
  visa:       '#1A1F71',
  mastercard: '#EB001B',
  amex:       '#2E77BC',
  cb:         '#005BAC',
};

const BRAND_LABEL: Record<string, string> = {
  visa:             'Visa',
  mastercard:       'Mastercard',
  amex:             'American Express',
  jcb:              'JCB',
  unionpay:         'UnionPay',
  diners:           'Diners Club',
  unknown:          'Carte',
};

function brandColor(brand: string): string {
  return BRAND_COLOR[brand.toLowerCase()] ?? colors.textMuted;
}

export const PaymentMethodsScreen: React.FC<Props> = ({ navigation }) => {
  const { data: methods, loading, execute } = useApi(paymentsApi.getMyMethods);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { t } = useTranslation('payment');
  const toast = useToast();
  const confirm = useConfirmDialogStore((s) => s.confirm);
  useEffect(() => { execute(); }, [execute]);

  const handleDelete = useCallback(async (method: PaymentMethod) => {
    const label = method.type === 'card'
      ? `${BRAND_LABEL[method.card?.brand ?? ''] ?? 'Carte'} ···${method.card?.last4}`
      : `SEPA ···${method.sepa?.last4}`;

    const ok = await confirm({
      title:        t('methods.delete_confirm_title'),
      message:      t('methods.delete_confirm_body', { label }),
      confirmLabel: t('methods.delete_confirm_btn'),
      cancelLabel:  t('methods.delete_cancel_btn'),
      confirmStyle: 'destructive',
    });
    if (!ok) return;
    setDeleting(method.id);
    try {
      await paymentsApi.detachMethod(method.id);
      execute();
    } catch {
      toast.error(t('methods.delete_error'), { title: t('methods.delete_error_title') });
    } finally {
      setDeleting(null);
    }
  }, [execute, confirm, t]);

  const methodList = (methods as any as PaymentMethod[]) ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('methods.screen_title')}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddPaymentMethod')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={20} color={colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        }
      />

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <ShieldCheck size={14} color={colors.success} strokeWidth={2} />
        <Text style={styles.infoText}>
          {t('methods.stripe_info')}
        </Text>
      </View>

      {loading && !methods ? (
        <View style={styles.skeletonWrap}>
          <PaymentListSkeleton count={3} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={execute} tintColor={colors.primary} />
          }
        >
          {methodList.length === 0 ? (
            <EmptyState
              Icon={CreditCard}
              title={t('methods.empty_title')}
              subtitle={t('methods.empty_subtitle')}
            />
          ) : (
            <View style={styles.list}>
              <Text style={styles.sectionTitle}>{t('methods.saved_label')}</Text>
              {methodList.map(method => (
                <MethodCard
                  key={method.id}
                  method={method}
                  onDelete={() => handleDelete(method)}
                  deleting={deleting === method.id}
                />
              ))}
            </View>
          )}

          {/* How it works */}
          <Card elevated style={styles.howCard}>
            <Text style={styles.howTitle}>{t('methods.how_title')}</Text>
            {[
              t('methods.security_1'),
              t('methods.security_2'),
              t('methods.security_3'),
            ].map((text, i) => (
              <View key={i} style={styles.howRow}>
                <View style={styles.howDot} />
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      )}
    </View>
  );
};

// ── MethodCard ────────────────────────────────────────────────────────────────
const MethodCard: React.FC<{
  method:   PaymentMethod;
  onDelete: () => void;
  deleting: boolean;
}> = ({ method, onDelete, deleting }) => {
  const isCard = method.type === 'card';
  const brand  = method.card?.brand ?? '';
  const accent = isCard ? brandColor(brand) : colors.info;

  return (
    <View style={[cardS.wrap, { borderLeftColor: accent }]}>
      {/* Icon */}
      <View style={[cardS.iconBox, { backgroundColor: accent + '18' }]}>
        {isCard
          ? <CreditCard size={20} color={accent} strokeWidth={1.8} />
          : <Landmark   size={20} color={accent} strokeWidth={1.8} />
        }
      </View>

      {/* Info */}
      <View style={cardS.info}>
        {isCard ? (
          <>
            <Text style={cardS.title}>
              {BRAND_LABEL[brand] ?? 'Carte'} ···· {method.card?.last4}
            </Text>
            <Text style={cardS.sub}>
              Expire {String(method.card?.expMonth).padStart(2, '0')}/{method.card?.expYear}
            </Text>
          </>
        ) : (
          <>
            <Text style={cardS.title}>SEPA ···· {method.sepa?.last4}</Text>
            <Text style={cardS.sub}>{method.sepa?.country} · Débit SEPA</Text>
          </>
        )}
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={cardS.deleteBtn}
        onPress={onDelete}
        disabled={deleting}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {deleting
          ? <ActivityIndicator size="small" color={colors.danger} />
          : <Trash2 size={16} color={colors.danger} strokeWidth={2} />
        }
      </TouchableOpacity>
    </View>
  );
};

const cardS = StyleSheet.create({
  wrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    padding:         spacing[4],
    gap:             spacing[3],
  },
  iconBox: {
    width:          42,
    height:         42,
    borderRadius:   radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  info:      { flex: 1 },
  title:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  sub:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3 },
  deleteBtn: {
    width:          36,
    height:         36,
    borderRadius:   18,
    backgroundColor: colors.dangerSurface,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
});

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  skeletonWrap:{ paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4] },

  infoBanner: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing[2],
    backgroundColor:   colors.successSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '30',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[3],
  },
  infoText: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.success,
    lineHeight: 16,
  },

  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[12],
    gap:               spacing[4],
  },
  list:         { gap: spacing[3] },
  sectionTitle: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom:  spacing[1],
  },

  howCard:  { gap: spacing[3] },
  howTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
  },
  howRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  howDot: {
    width:        5,
    height:       5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop:    6,
    flexShrink:   0,
  },
  howText: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    lineHeight: 16,
  },
});
