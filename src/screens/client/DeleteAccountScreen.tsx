/**
 * DeleteAccountScreen — RGPD-compliant account deletion flow.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle } from 'lucide-react-native';
import { usersApi }     from '@api/endpoints/users';
import { useAuthStore } from '@store/authStore';
import { Input }        from '@components/ui/Input';
import { Button }       from '@components/ui/Button';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<ProfileStackParamList, 'DeleteAccount'>;

export const DeleteAccountScreen: React.FC<Props> = ({ navigation }) => {
  const { t }     = useTranslation('account');
  const { t: tc } = useTranslation('common'); // cross-namespace: error title

  const { logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [phrase,   setPhrase]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const CONFIRM_PHRASE = t('delete.confirm_phrase');
  const canDelete = phrase === CONFIRM_PHRASE && password.length >= 6;

  const handleDelete = () => {
    Alert.alert(
      t('delete.confirm_title'),
      t('delete.confirm_body'),
      [
        { text: t('delete.cancel'), style: 'cancel' },
        {
          text: t('delete.delete_btn'), style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await usersApi.deleteMe(password);
              logout();
            } catch (err: any) {
              Alert.alert(tc('error'), err?.response?.data?.message ?? t('delete.error'));
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const DELETE_ITEMS = [
    t('delete.item_personal'),
    t('delete.item_missions'),
    t('delete.item_payments'),
    t('delete.item_conversations'),
    t('delete.item_ratings'),
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('delete.screen_title')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning banner */}
        <View style={styles.warningCard}>
          <AlertTriangle size={24} color={colors.danger} strokeWidth={1.8} />
          <View style={styles.warningText}>
            <Text style={styles.warningTitle}>{t('delete.warning_title')}</Text>
            <Text style={styles.warningBody}>{t('delete.warning_body')}</Text>
          </View>
        </View>

        {/* Deleted items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('delete.deleted_items_title')}</Text>
          {DELETE_ITEMS.map(item => (
            <View key={item} style={styles.deleteItem}>
              <View style={styles.deleteDot} />
              <Text style={styles.deleteItemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('delete.password_label')}</Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder={t('delete.password_placeholder')}
              secureTextEntry
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('delete.phrase_label')}</Text>
            <Input
              value={phrase}
              onChangeText={setPhrase}
              placeholder={CONFIRM_PHRASE}
              autoCapitalize="characters"
            />
            {phrase.length > 0 && phrase !== CONFIRM_PHRASE && (
              <Text style={styles.phraseError}>{t('delete.phrase_error')}</Text>
            )}
          </View>
        </View>

        <Button
          label={loading ? t('delete.deleting') : t('delete.delete_btn')}
          onPress={handleDelete}
          loading={loading}
          disabled={!canDelete}
          fullWidth
          size="lg"
          variant="danger"
          style={styles.deleteBtn}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: colors.background },
  content:       { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[6], paddingBottom: spacing[12], gap: spacing[6] },
  warningCard:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4], backgroundColor: colors.dangerSurface, borderRadius: radius.xl, padding: spacing[5], borderWidth: 1, borderColor: colors.danger + '40' },
  warningText:   { flex: 1, gap: spacing[2] },
  warningTitle:  { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.danger, letterSpacing: -0.3 },
  warningBody:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  section:       { gap: spacing[3] },
  sectionTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
  deleteItem:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  deleteDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dangerDot, flexShrink: 0 },
  deleteItemText:{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  fields:        { gap: spacing[4] },
  fieldGroup:    { gap: spacing[2] },
  fieldLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 1.2 },
  phraseError:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },
  deleteBtn:     { marginTop: spacing[2] },
});

