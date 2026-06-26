/**
 * ProfileEditScreen ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â edit first/last name, phone (E.164 PhoneInput), avatar.
 *
 * NOTE on the name model: the backend User entity stores a single `fullName`
 * (the /users/me PATCH DTO accepts `fullName`, not first/last). To match the
 * RegisterScreen UX we present TWO fields (first / last) but recombine them into
 * `fullName` on save, and split the stored `fullName` back into first/last on
 * load (first whitespace token = first name, remainder = last name). This keeps
 * the API contract unchanged while giving the requested two-field UI.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, User, Check } from 'lucide-react-native';
import { usersApi }     from '@api/endpoints/users';
import { uploadApi }    from '@api/endpoints/upload';
import { useAuthStore } from '@store/authStore';
import { Input }        from '@components/ui/Input';
import { Button }       from '@components/ui/Button';
import { Avatar }       from '@components/ui/Avatar';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { PhoneInput, validatePhone } from '@components/ui/PhoneInput';
import { colors }       from '@theme/colors';
import { spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';
import { useTranslation } from '@i18n';
import { useToast } from '@hooks/useToast';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileEdit'>;

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Helpers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
/** Split a stored fullName into { first, last }: first token = first name. */
const splitFullName = (full: string | undefined | null): { first: string; last: string } => {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
};

/** Recombine first + last into a single normalized fullName. */
const joinFullName = (first: string, last: string): string =>
  `${first.trim()} ${last.trim()}`.replace(/\s+/g, ' ').trim();

export const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { t }      = useTranslation('account');
  const { t: tc }  = useTranslation('common');

  const toast = useToast();
  const { user, setUser } = useAuthStore();

  const initialName = splitFullName(user?.fullName);
  const [firstName,   setFirstName]   = useState(initialName.first);
  const [lastName,    setLastName]    = useState(initialName.last);
  // PhoneInput is controlled with a full E.164 value; user.phone is already
  // stored in E.164 (RegisterScreen normalizes it on signup).
  const [phone,       setPhone]       = useState(user?.phone ?? '');
  const [loading,     setLoading]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [previewUri,  setPreviewUri]  = useState<string | null>(null);

  const composedName = joinFullName(firstName, lastName);

  const isDirty =
    composedName     !== (user?.fullName ?? '').trim() ||
    phone.trim()     !== (user?.phone    ?? '');

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
      const resObj = res as { data?: { avatarUrl?: string }; avatarUrl?: string };
      const avatarUrl = resObj.data?.avatarUrl ?? resObj.avatarUrl;

      if (avatarUrl) {
        setUser({ ...user!, avatarUrl });
      }
    } catch (err: unknown) {
      setPreviewUri(null);
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('edit.error'), { title: tc('error') });
    } finally {
      setAvatarUploading(false);
    }
  }, [user, setUser, t, tc, toast]);

  const handleSave = useCallback(async () => {
    // Name: both parts effectively required (first token must exist).
    if (!firstName.trim() || !lastName.trim()) {
      toast.warning(t('edit.name_required_body'), { title: t('edit.name_required_title') });
      return;
    }

    // Phone: optional, but if present must be a valid FR number.
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const national = trimmedPhone.replace(/^\+33/, '');
      if (!validatePhone(national, 'FR').valid) {
        toast.warning(t('edit.phone_invalid_body'), { title: t('edit.phone_invalid_title') });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: res } = await usersApi.updateMe({
        fullName: composedName,
        phone:    trimmedPhone || undefined,
      });
      setUser(((res as { data?: unknown }).data ?? res) as Parameters<typeof setUser>[0]);
      setSaved(true);
      setTimeout(() => { setSaved(false); navigation.goBack(); }, 800);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('edit.error'), { title: tc('error') });
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, composedName, phone, setUser, navigation, t, tc, toast]);

  // Avatar affichÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© : prÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©visualisation locale > avatarUrl du store > initiales
  const displayAvatarUri = previewUri ?? user?.avatarUrl ?? undefined;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('edit.title')}
        onBack={() => navigation.goBack()}
        rightElement={
          isDirty ? (
            <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave} disabled={loading} accessibilityRole="button" accessibilityLabel={t('edit.save')} accessibilityState={{ disabled: loading, busy: loading }}>
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
        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Avatar ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            disabled={avatarUploading}
            accessibilityRole="button"
            accessibilityLabel={t('edit.avatar_hint')}
            accessibilityState={{ disabled: avatarUploading, busy: avatarUploading }}
          >
            {displayAvatarUri ? (
              <Image
                source={{ uri: displayAvatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Avatar name={composedName || user?.fullName} size={80} />
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
            {avatarUploading ? 'Envoi en coursÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦' : t('edit.avatar_hint')}
          </Text>
        </View>

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Champs ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <View style={styles.fields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('edit.first_name_label')}</Text>
            <Input
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('edit.first_name_placeholder')}
              autoCapitalize="words"
              leftIcon={<User size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('edit.last_name_label')}</Text>
            <Input
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('edit.last_name_placeholder')}
              autoCapitalize="words"
              leftIcon={<User size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
          </View>

          {/* Phone ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â same E.164 PhoneInput component used on the register screen */}
          <PhoneInput
            label={t('edit.phone_label')}
            value={phone}
            onChangePhone={setPhone}
            autoValidate
          />
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
