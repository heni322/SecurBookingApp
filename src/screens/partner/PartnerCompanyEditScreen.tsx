/**
 * PartnerCompanyEditScreen — Mettre à jour les informations de la société.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePartnerT } from './_partnerI18n';
import { Building2, Hash, MapPin, CircleCheckBig, CircleAlert } from 'lucide-react-native';
import { partnerApi }   from '@api/endpoints/partner';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { Separator }    from '@components/ui/Separator';
import { showAlert }    from '@components/ui/AlertModal';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { Company, PartnerProfileStackParamList } from '@models/index';

// PartnerCompanyEditScreen lives in PartnerProfileStackNavigator (Profile tab).
type Nav = NativeStackNavigationProp<PartnerProfileStackParamList, 'PartnerCompanyEdit'>;

function isValidSiret(v: string): boolean {
  const digits = v.replace(/\s/g, '');
  if (!/^\d{14}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(digits[i], 10);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  const luhnOk = sum % 10 === 0;
  // Exception La Poste (SIREN 356000000) : somme des chiffres multiple de 5
  // (le siege 35600000000048 valide via Luhn standard) - accepter les deux.
  if (digits.startsWith('356000000')) {
    return luhnOk || digits.split('').reduce((s, c) => s + Number(c), 0) % 5 === 0;
  }
  return luhnOk;
}

interface FieldProps {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; icon: React.ReactNode; error?: string | null;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  maxLength?: number; autoCapitalize?: 'none' | 'sentences' | 'words';
}

const Field: React.FC<FieldProps> = ({ label, value, onChangeText, placeholder, icon, error, keyboardType = 'default', maxLength, autoCapitalize = 'words' }) => (
  <View style={fld.wrap}>
    <Text style={fld.label}>{label}</Text>
    <View style={[fld.row, error ? fld.rowError : null]}>
      <View style={fld.iconWrap}>{icon}</View>
      <TextInput style={fld.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType={keyboardType} maxLength={maxLength} autoCapitalize={autoCapitalize} autoCorrect={false} />
    </View>
    {error ? (
      <View style={fld.errorRow}>
        <CircleAlert size={11} color={colors.danger} strokeWidth={2} />
        <Text style={fld.errorTxt}>{error}</Text>
      </View>
    ) : null}
  </View>
);

const fld = StyleSheet.create({
  wrap:     { gap: spacing[1] },
  label:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  row:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  rowError: { borderColor: colors.danger },
  iconWrap: { width: 44, alignItems: 'center', justifyContent: 'center' },
  input:    { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textPrimary, paddingVertical: spacing[3], paddingRight: spacing[3] },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  errorTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },
});

export const PartnerCompanyEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();

  const [companyName, setCompanyName] = useState('');
  const [siret,       setSiret]       = useState('');
  const [address,     setAddress]     = useState('');
  const [city,        setCity]        = useState('');
  const [zipCode,     setZipCode]     = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity,    setBillingCity]    = useState('');
  const [billingZipCode, setBillingZipCode] = useState('');
  const [vatNumber,      setVatNumber]      = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [errors,   setErrors]   = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await partnerApi.getCompany();
        const company: Company | null = (((res.data as any)?.data ?? res.data) as Company | null);
        if (company) {
          setCompanyName(company.companyName ?? '');
          setSiret(company.siret ?? '');
          setAddress(company.address ?? '');
          setCity(company.city ?? '');
          setZipCode(company.zipCode ?? '');
          setBillingAddress(company.billingAddress ?? '');
          setBillingCity(company.billingCity ?? '');
          setBillingZipCode(company.billingZipCode ?? '');
          setVatNumber(company.vatNumber ?? '');
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!companyName.trim()) e.companyName = t('companyEdit.validation.nameRequired.body');
    if (siret.trim() && !isValidSiret(siret)) e.siret = t('companyEdit.validation.siretInvalid');
    if (zipCode.trim() && !/^\d{5}$/.test(zipCode)) e.zipCode = t('companyEdit.validation.zipInvalid');
    if (billingZipCode.trim() && !/^\d{5}$/.test(billingZipCode)) e.billingZipCode = t('companyEdit.validation.zipInvalid');
    if (vatNumber.trim() && /^FR/i.test(vatNumber.trim()) && !/^FR[0-9A-Za-z]{2}\d{9}$/.test(vatNumber.replace(/\s/g, '').toUpperCase())) e.vatNumber = t('companyEdit.validation.vatInvalid');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaved(false);
    try {
      await partnerApi.updateCompany({ companyName: companyName.trim(), siret: siret.replace(/\s/g, ''), address: address.trim() || undefined, city: city.trim() || undefined, zipCode: zipCode.trim() || undefined, billingAddress: billingAddress.trim() || undefined, billingCity: billingCity.trim() || undefined, billingZipCode: billingZipCode.trim() || undefined, vatNumber: vatNumber.trim().toUpperCase() || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 3_000);
    } catch (err: any) {
      showAlert(t('companyEdit.errors.saveFailed'), err?.response?.data?.message ?? '');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('companyEdit.title')} onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        <ScreenHeader title={t('companyEdit.title')} subtitle={t('companyEdit.sections.legalInfo')} onBack={() => navigation.goBack()} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {saved && (
            <View style={styles.savedBanner}>
              <CircleCheckBig size={15} color={colors.success} strokeWidth={2} />
              <Text style={styles.savedTxt}>{t('companyEdit.success.body')}</Text>
            </View>
          )}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('companyEdit.sections.legalInfo')}</Text>
            <Field
              label={t('companyEdit.fields.companyName.label')}
              value={companyName}
              onChangeText={v => { setCompanyName(v); setErrors(e => ({ ...e, companyName: undefined })); }}
              placeholder={t('companyEdit.fields.companyName.placeholder')}
              icon={<Building2 size={16} color={colors.textMuted} strokeWidth={1.8} />}
              error={errors.companyName}
            />
            <Separator marginV={spacing[3]} />
            <Field
              label={t('companyEdit.fields.siret.label')}
              value={siret}
              onChangeText={v => { setSiret(v); setErrors(e => ({ ...e, siret: undefined })); }}
              placeholder={t('companyEdit.fields.siret.placeholder')}
              icon={<Hash size={16} color={colors.textMuted} strokeWidth={1.8} />}
              error={errors.siret}
              keyboardType="numeric"
              maxLength={14}
              autoCapitalize="none"
            />
            {isValidSiret(siret) && !errors.siret && (
              <View style={styles.siretOk}>
                <CircleCheckBig size={12} color={colors.success} strokeWidth={2.5} />
                <Text style={styles.siretOkTxt}>{t('companyEdit.validation.siretValid')}</Text>
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('companyEdit.sections.address')}</Text>
            <Field
              label={t('companyEdit.fields.address.label')}
              value={address} onChangeText={setAddress}
              placeholder={t('companyEdit.fields.address.placeholder')}
              icon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
            <Separator marginV={spacing[3]} />
            <View style={styles.cityRow}>
              <View style={{ width: 100 }}>
                <Field
                  label={t('companyEdit.fields.zipCode.label')}
                  value={zipCode}
                  onChangeText={v => { setZipCode(v); setErrors(e => ({ ...e, zipCode: undefined })); }}
                  placeholder={t('companyEdit.fields.zipCode.placeholder')}
                  icon={<Hash size={14} color={colors.textMuted} strokeWidth={1.8} />}
                  error={errors.zipCode}
                  keyboardType="numeric" maxLength={5} autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('companyEdit.fields.city.label')}
                  value={city} onChangeText={setCity}
                  placeholder={t('companyEdit.fields.city.placeholder')}
                  icon={<Building2 size={14} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('companyEdit.sections.billing')}</Text>
            <Field
              label={t('companyEdit.fields.billingAddress.label')}
              value={billingAddress} onChangeText={setBillingAddress}
              placeholder={t('companyEdit.fields.billingAddress.placeholder')}
              icon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
            <Separator marginV={spacing[3]} />
            <View style={styles.cityRow}>
              <View style={{ width: 100 }}>
                <Field
                  label={t('companyEdit.fields.billingZipCode.label')}
                  value={billingZipCode}
                  onChangeText={v => { setBillingZipCode(v); setErrors(e => ({ ...e, billingZipCode: undefined })); }}
                  placeholder={t('companyEdit.fields.billingZipCode.placeholder')}
                  icon={<Hash size={14} color={colors.textMuted} strokeWidth={1.8} />}
                  error={errors.billingZipCode}
                  keyboardType="numeric" maxLength={5} autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('companyEdit.fields.billingCity.label')}
                  value={billingCity} onChangeText={setBillingCity}
                  placeholder={t('companyEdit.fields.billingCity.placeholder')}
                  icon={<Building2 size={14} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
            </View>
            <Separator marginV={spacing[3]} />
            <Field
              label={t('companyEdit.fields.vatNumber.label')}
              value={vatNumber}
              onChangeText={v => { setVatNumber(v); setErrors(e => ({ ...e, vatNumber: undefined })); }}
              placeholder={t('companyEdit.fields.vatNumber.placeholder')}
              icon={<Hash size={16} color={colors.textMuted} strokeWidth={1.8} />}
              error={errors.vatNumber}
              autoCapitalize="none"
            />
          </Card>

          <Button
            label={saving ? t('companyEdit.actions.saving') : t('companyEdit.actions.save')}
            onPress={handleSave}
            loading={saving}
            disabled={!companyName.trim() || saving}
            fullWidth size="lg"
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  content:     { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.successSurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.success + '55' },
  savedTxt:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.success, flex: 1 },
  section:      { gap: spacing[3] },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2, marginBottom: spacing[1] },
  siretOk:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  siretOkTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.success },
  cityRow: { flexDirection: 'row', gap: spacing[3] },
});
