/**
 * ProfileEditScreen — edit name, phone, avatar with live preview.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, User, Phone, Check } from 'lucide-react-native';
import { usersApi }     from '@api/endpoints/users';
import { uploadApi }    from '@api/endpoints/upload';
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
  const { t: tc }  = useTranslation('common');

  const { user, setUser } = useAuthStore();
  const [fullName,    setFullName]    = useState(user?.fullName ?? '');
  const [phone,       setPhone]       = useState(user?.phone    ?? '');
  const [loading,     setLoading]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [previewUri,  setPreviewUri]  = useState<string | null>(null);

  const isDirty =
    fullName.trim() !== (user?.fullName ?? '') ||
    phone.trim()    !== (user?.phone    ?? '');

  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType:   'photo',
        quality:     0.8,
        maxWidth:    800,
        maxHeight:   800,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset    = result.assets[0];
      const fileUri  = asset.uri!;
      const fileName = asset.fileName ?? `avatar_${Date.now()}.jpg`;
      const mimeType = asset.type     ?? 'image/jpeg';

      setPreviewUri(fileUri);
      setAvatarUploading(true);

      const res = await uploadApi.uploadAvatar(fileUri, fileName, mimeType);
      const avatarUrl = (res as any).data?.avatarUrl ?? (res as any).avatarUrl;

      if (avatarUrl) {
        setUser({ ...user!, avatarUrl });
      }
    } catch (err: any) {
      setPreviewUri(null);
      Alert.alert(tc('error'), err?.response?.data?.message ?? t('edit.error'));
    } finally {
      setAvatarUploading(false);
    }
  }, [user, setUser, t, tc]);

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

  // Avatar affiché : prévisualisation locale > avatarUrl du store > initiales
  const displayAvatarUri = previewUri ?? user?.avatarUrl ?? undefined;

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
        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            disabled={avatarUploading}
          >
            {displayAvatarUri ? (
              <Image
                source={{ uri: displayAvatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Avatar name={fullName || user?.fullName} size={80} />
            )}

            {/* Overlay spinner pendant l'upload */}
            {avatarUploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color={colors.textInverse} />
              </View>
            ) : (
              <View style={styles.cameraBtn}>
                <Camera size={14} color={colors.textInverse} strokeWidth={2} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.avatarHint}>
            {avatarUploading ? 'Envoi en cours…' : t('edit.avatar_hint')}
          </Text>
        </View>

        {/* ── Champs ── */}
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
  avatarImage:   { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.primary },
  avatarOverlay: { position: 'absolute', inset: 0, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBtn:     { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  avatarHint:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  fields:        { gap: spacing[4] },
  fieldGroup:    { gap: spacing[2] },
  fieldLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 1.2 },
  saveHeaderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  saveBtn:       { marginTop: spacing[2] },
});
