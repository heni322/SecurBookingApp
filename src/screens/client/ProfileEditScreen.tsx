/**
 * ProfileEditScreen — edit name, phone, avatar with live preview.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, User, Phone, Check } from 'lucide-react-native';
import { usersApi }     from '@api/endpoints/users';
import { useAuthStore } from '@store/authStore';
import { Input }        from '@components/ui/Input';
import { Button }       from '@components/ui/Button';
import { Avatar }       from '@components/ui/Avatar';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileEdit'>;

export const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { t }      = useTranslation('account');
  const { t: tc }  = useTranslation('common'); // cross-namespace: error title

  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone,    setPhone]    = useState(user?.phone    ?? '');
  const [loading,  setLoading]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  const isDirty =
    fullName.trim() !== (user?.fullName ?? '') ||
    phone.trim()    !== (user?.phone    ?? '');

  const handleSave = useCallback(async () => {
    if (!fullName.trim()) {
      Alert.alert(t('edit.name_required_title'), t('edit.name_required_body'));
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await usersApi.updateMe({
        fullName: fullName.trim(),
        phone:    phone.trim() || undefined,
      });
      setUser((res as any).data ?? res);
      setSaved(true);
      setTimeout(() => { setSaved(false); navigation.goBack(); }, 800);
    } catch (err: any) {
      Alert.alert(tc('error'), err?.response?.data?.message ?? t('edit.error'));
    } finally {
      setLoading(false);
    }
  }, [fullName, phone, setUser, navigation, t, tc]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('edit.title')}
        onBack={() => navigation.goBack()}
        rightElement={
          isDirty ? (
            <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Check size={18} color={colors.primary} strokeWidth={2.5} />
              }
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Avatar name={fullName || user?.fullName} size={80} />
            <View style={styles.cameraBtn}>
              <Camera size={14} color={colors.textInverse} strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.avatarHint}>{t('edit.avatar_hint')}</Text>
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('edit.full_name_label')}</Text>
            <Input
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('edit.full_name_placeholder')}
              autoCapitalize="words"
              leftIcon={<User size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('edit.phone_label')}</Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder={t('edit.phone_placeholder')}
              keyboardType="phone-pad"
              leftIcon={<Phone size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
          </View>
        </View>

        <Button
          label={saved ? t('edit.saved') : t('edit.save')}
          onPress={handleSave}
          loading={loading}
          disabled={!isDirty || saved}
          fullWidth
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: colors.background },
  content:       { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[6], paddingBottom: spacing[12], gap: spacing[6] },
  avatarSection: { alignItems: 'center', gap: spacing[3] },
  avatarWrap:    { position: 'relative' },
  cameraBtn:     { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  avatarHint:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  fields:        { gap: spacing[4] },
  fieldGroup:    { gap: spacing[2] },
  fieldLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 1.2 },
  saveHeaderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  saveBtn:       { marginTop: spacing[2] },
});
