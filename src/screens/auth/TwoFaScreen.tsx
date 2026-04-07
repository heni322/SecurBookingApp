import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ← FIX: use @-alias paths (relative '../..' was wrong for this file's depth)
import { Button, ScreenHeader } from '@components/ui';
import { colors }               from '@theme/colors';
import { spacing }              from '@theme/spacing';
import apiClient                from '@api/client';
import { useAuthStore }         from '@store/authStore';
import type { AuthStackParamList, AuthTokens } from '@models/index';

// ← FIX: NativeStackScreenProps instead of hand-rolled interface
type Props = NativeStackScreenProps<AuthStackParamList, 'TwoFa'>;

export default function TwoFaScreen({ route }: Props) {
  const { tempToken } = route.params;
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);
  const { hydrate } = useAuthStore();

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...code];
    next[idx]   = digit;
    setCode(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const verify = async () => {
    const otp = code.join('');
    if (otp.length < 6) { Alert.alert('Code incomplet', 'Entrez les 6 chiffres.'); return; }
    setLoading(true);
    try {
      const res     = await apiClient.post('/auth/2fa/verify', { tempToken, otp });
      const payload = res.data?.data ?? res.data;
      const { user } = payload;

      // ← FIX: expiresIn required by AuthTokens — default to 0 if absent
      const tokens: AuthTokens = {
        accessToken:  payload.accessToken  ?? payload.tokens?.accessToken,
        refreshToken: payload.refreshToken ?? payload.tokens?.refreshToken,
        expiresIn:    payload.expiresIn    ?? payload.tokens?.expiresIn ?? 0,
      };
      hydrate(user, tokens);
    } catch {
      Alert.alert('Code invalide', 'Le code est incorrect ou expiré.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await apiClient.post('/auth/2fa/resend', { tempToken });
      Alert.alert('Code renvoyé', 'Un nouveau code a été envoyé.');
    } catch { Alert.alert('Erreur', 'Impossible de renvoyer le code.'); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ← FIX: showBack={false} now accepted by ScreenHeader */}
      <ScreenHeader title="Vérification" showBack={false} />
      <View style={styles.content}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Code de vérification</Text>
        <Text style={styles.sub}>
          Entrez le code à 6 chiffres envoyé sur votre téléphone ou généré par votre app 2FA.
        </Text>

        <View style={styles.row}>
          {code.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[styles.box, !!d && styles.boxFilled]}
              value={d}
              onChangeText={(v) => handleChange(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* ← FIX: title prop now accepted by Button */}
        <Button label="Vérifier" onPress={verify} loading={loading} style={styles.btn} />
        <TouchableOpacity onPress={resend} style={styles.resend}>
          <Text style={styles.resendTxt}>Renvoyer le code</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  icon:      { fontSize: 52, marginBottom: spacing.lg },
  title:     { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  sub:       { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 },
  row:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  box: {
    width: 46, height: 54, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: colors.text, backgroundColor: colors.surface,
  },
  boxFilled:  { borderColor: colors.primary },
  btn:        { width: '100%', marginBottom: spacing.md },
  resend:     { padding: spacing.sm },
  resendTxt:  { color: colors.primary, fontSize: 14, fontWeight: '500' },
});
