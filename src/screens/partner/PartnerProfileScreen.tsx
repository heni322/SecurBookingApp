/**
 * PartnerProfileScreen â€” Profil société partenaire.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Building2, ChevronRight, FileText, ShieldCheck,
  Pencil, LogOut, Mail, MapPin, Hash, CircleCheckBig, TriangleAlert,
} from 'lucide-react-native';
import { partnerApi }            from '@api/endpoints/partner';
import { partnerDocumentsApi }   from '@api/endpoints/partnerDocuments';
import { authApi }               from '@api/endpoints/auth';
import { useAuthStore }          from '@store/authStore';
import { tokenStorage }          from '@services/tokenStorage';
import { ScreenHeader }          from '@components/ui/ScreenHeader';
import { Card }                  from '@components/ui/Card';
import { PhoneVerificationCard }  from '@components/domain/PhoneVerificationCard';
import { Separator }             from '@components/ui/Separator';
import { showAlert }             from '@components/ui/AlertModal';
import { colors, palette }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { Company, PartnerComplianceStatus, PartnerStackParamList } from '@models/index';

type Nav        = NativeStackNavigationProp<PartnerStackParamList>;
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

export const PartnerProfileScreen: React.FC = () => {
  const navigation       = useNavigation<Nav>();
  const { user, logout } = useAuthStore();
  const { t } = usePartnerT();

  const [company,    setCompany]    = useState<Company | null>(null);
  const [compliance, setCompliance] = useState<PartnerComplianceStatus | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [dashRes, complRes] = await Promise.all([
        partnerApi.getDashboard(),
        partnerDocumentsApi.getComplianceStatus().catch(() => null),
      ]);
      const dashData = (dashRes.data as any)?.data ?? dashRes.data;
      setCompany(dashData?.company ?? null);
      if (complRes) {
        const complData = (complRes.data as any)?.data ?? complRes.data;
        setCompliance(complData ?? null);
      }
    } catch (err: any) {
      showAlert(t('profile.errors.generic'), err?.response?.data?.message ?? t('profile.errors.loadFailed'));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    showAlert(
      t('profile.logout.title'),
      t('profile.logout.body'),
      [
        { text: t('profile.logout.cancel'), style: 'cancel' },
        {
          text: t('profile.logout.confirm'),
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              const rt = tokenStorage.getRefreshToken();
              if (rt) await authApi.logout(rt);
            } catch {
              /* silent — local logout still proceeds below */
            } finally {
              setLogoutLoading(false);
              logout();
            }
          },
        },
      ],
    );
  };

  if (loading && !company) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('profile.title')} />
        <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  const progress       = compliance?.progress;
  const isCompliant    = compliance?.isFullyCompliant ?? false;
  const compliantCount = progress?.approved ?? 0;
  const totalDocs      = progress?.total    ?? 0;
  const missingCount   = progress?.missing  ?? 0;
  const rejectedCount  = progress?.rejected ?? 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('profile.title')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* Identity */}
        <Card style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            {company?.logoUrl
              ? <Image source={{ uri: company.logoUrl }} style={styles.heroLogo} />
              : <Building2 size={32} color={colors.primary} strokeWidth={1.6} />
            }
          </View>
          <Text style={styles.companyName} numberOfLines={1}>{company?.companyName ?? 'â€”'}</Text>
          <View style={styles.heroMeta}>
            {company?.siret  && <MetaRow Icon={Hash}   label={t('profile.company.siret')}   value={company.siret} mono />}
            {company?.city   && <MetaRow Icon={MapPin}  label={t('profile.company.address')} value={[company.address, company.zipCode, company.city].filter(Boolean).join(' Â· ')} />}
            {user?.email     && <MetaRow Icon={Mail}    label={t('profile.company.contact')} value={user.email} />}
          </View>
        </Card>

        <PhoneVerificationCard />

        {/* Compliance banner */}
        <TouchableOpacity
          style={[styles.complianceBanner, isCompliant ? styles.bannerOk : (missingCount > 0 || rejectedCount > 0) ? styles.bannerWarn : styles.bannerNeutral]}
          onPress={() => navigation.navigate('PartnerCompliance')}
          activeOpacity={0.85}
        >
          <View style={[styles.bannerIcon, isCompliant ? styles.bannerIconOk : styles.bannerIconWarn]}>
            {isCompliant
              ? <CircleCheckBig size={20} color={colors.success} strokeWidth={2} />
              : <TriangleAlert size={20} color={palette.gold} strokeWidth={2} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {isCompliant ? t('profile.compliance.ok') : t('profile.compliance.inProgress')}
            </Text>
            <Text style={styles.bannerSub}>
              {totalDocs > 0
                ? t('profile.compliance.docsValidated', { approved: compliantCount, total: totalDocs })
                : t('profile.compliance.noDocsYet')}
              {rejectedCount > 0 && ' ' + t(rejectedCount === 1 ? 'profile.compliance.rejected_one' : 'profile.compliance.rejected_other', { count: rejectedCount })}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>

        {/* Company section */}
        <Text style={styles.sectionTitle}>{t('profile.sections.company')}</Text>
        <Card>
          <Row Icon={Pencil}     label={t('profile.rows.editCompany')}    sub={t('profile.rows.editCompanySub')}    onPress={() => navigation.navigate('PartnerCompanyEdit')} />
          <Separator />
          <Row
            Icon={FileText}
            label={t('profile.rows.legalDocuments')}
            sub={t('profile.rows.legalDocumentsSub')}
            badge={
              missingCount  > 0 ? { text: t(missingCount  === 1 ? 'profile.rows.missing_one' : 'profile.rows.missing_other',  { count: missingCount  }), color: palette.gold     } :
              rejectedCount > 0 ? { text: t(rejectedCount === 1 ? 'profile.rows.rejected_one' : 'profile.rows.rejected_other', { count: rejectedCount }), color: colors.danger } :
              undefined
            }
            onPress={() => navigation.navigate('PartnerDocuments')}
          />
          <Separator />
          <Row Icon={ShieldCheck} label={t('profile.rows.compliance')} sub={t('profile.rows.complianceSub')} onPress={() => navigation.navigate('PartnerCompliance')} />
        </Card>

        {/* Account section */}
        <Text style={styles.sectionTitle}>{t('profile.sections.account')}</Text>
        <Card>
          <Row Icon={LogOut} label={logoutLoading ? t('profile.logout.inProgress') : t('profile.rows.logout')} onPress={handleLogout} danger />
        </Card>

        <Text style={styles.footer}>{t('profile.footer')}</Text>
      </ScrollView>
    </View>
  );
};

const MetaRow: React.FC<{ Icon: LucideIcon; label: string; value: string; mono?: boolean }> = ({ Icon, label, value, mono }) => (
  <View style={metaStyles.row}>
    <Icon size={14} color={colors.textMuted} strokeWidth={2} />
    <Text style={metaStyles.label}>{label}</Text>
    <Text style={[metaStyles.value, mono && metaStyles.mono]} numberOfLines={1}>{value}</Text>
  </View>
);

const Row: React.FC<{
  Icon: LucideIcon; label: string; sub?: string; onPress: () => void;
  danger?: boolean; badge?: { text: string; color: string };
}> = ({ Icon, label, sub, onPress, danger, badge }) => (
  <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[rowStyles.iconWrap, danger && rowStyles.iconWrapDanger]}>
      <Icon size={18} color={danger ? colors.danger : colors.primary} strokeWidth={1.8} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[rowStyles.label, danger && rowStyles.labelDanger]}>{label}</Text>
      {sub && <Text style={rowStyles.sub}>{sub}</Text>}
    </View>
    {badge && (
      <View style={[rowStyles.badge, { backgroundColor: badge.color + '20', borderColor: badge.color + '60' }]}>
        <Text style={[rowStyles.badgeTxt, { color: badge.color }]}>{badge.text}</Text>
      </View>
    )}
    {!danger && <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  content:     { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[12] },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard:    { alignItems: 'center', padding: spacing[5], marginTop: spacing[3], gap: spacing[2] },
  heroIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySurface, borderWidth: 1.5, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2], overflow: 'hidden' },
  heroLogo:    { width: '100%', height: '100%' },
  companyName: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.5 },
  heroMeta:    { width: '100%', gap: spacing[2], marginTop: spacing[3] },
  complianceBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, marginTop: spacing[4] },
  bannerOk:     { backgroundColor: colors.successSurface, borderColor: colors.success + '40' },
  bannerWarn:   { backgroundColor: palette.amberDim + '30', borderColor: palette.gold + '60' },
  bannerNeutral:{ backgroundColor: palette.white05, borderColor: palette.white10 },
  bannerIcon:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bannerIconOk: { backgroundColor: colors.successSurface },
  bannerIconWarn:{ backgroundColor: palette.amberDim },
  bannerTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  bannerSub:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing[6], marginBottom: spacing[2] },
  footer: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing[6] },
});
const metaStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, width: 64 },
  value: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  mono:  { fontFamily: 'Menlo' },
});
const rowStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[2] },
  iconWrap:  { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  iconWrapDanger:{ backgroundColor: colors.dangerSurface },
  label:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  labelDanger:{ color: colors.danger },
  sub:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  badge:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeTxt:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
});
