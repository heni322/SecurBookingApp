import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { authApi }      from '@api/endpoints/auth';
import { tokenStorage } from '@services/tokenStorage';
import { useAuthStore } from '@store/authStore';
import { Button }  from '@components/ui/Button';
import { Input }   from '@components/ui/Input';
import { colors }  from '@theme/colors';
import { spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AuthStackParamList, AuthTokens, User } from '@models/index';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email,    setEmail]    = useState(__DEV__ ? 'client@demo.fr' : '');
  const [password, setPassword] = useState(__DEV__ ? 'Demo@Client2026!' : '');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const { hydrate } = useAuthStore();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim())               e.email    = 'Email requis';
    if (!/\S+@\S+\.\S+/.test(email)) e.email   = 'Email invalide';
    if (!password)                   e.password = 'Mot de passe requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: res } = await authApi.login({
        email:    email.trim().toLowerCase(),
        password,
      });

      const payload = (res as any).data as any;

      // ── 2FA requis → TwoFaScreen ──────────────────────────────────────────
      if (payload?.requires2fa && payload?.tempToken) {
        navigation.navigate('TwoFa', { tempToken: payload.tempToken });
        return;
      }

      // ── Login direct ──────────────────────────────────────────────────────
      const { user, tokens } = payload as { user: User; tokens: AuthTokens };
      if (!tokens?.accessToken) throw new Error('Réponse invalide');
      tokenStorage.setTokens(tokens);
      hydrate(user, tokens);

    } catch (err: unknown) {
      const status  = (err as any)?.response?.status;
      const message = (err as any)?.response?.data?.message ?? 'Erreur de connexion';
      Alert.alert('Connexion impossible', status === 401 ? 'Email ou mot de passe incorrect.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <ShieldCheck size={40} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.brand}>SecurBook</Text>
          <Text style={styles.tagline}>Sécurité privée on‑demand</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Connexion</Text>

          <Input
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="vous@exemple.com"
            error={errors.email}
            leftIcon={<Mail size={16} color={colors.textMuted} strokeWidth={1.8} />}
          />
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholder="••••••••"
            error={errors.password}
            leftIcon={<Lock size={16} color={colors.textMuted} strokeWidth={1.8} />}
            rightIcon={showPass
              ? <EyeOff size={16} color={colors.textMuted} strokeWidth={1.8} />
              : <Eye    size={16} color={colors.textMuted} strokeWidth={1.8} />}
            onRightPress={() => setShowPass((v) => !v)}
          />

          <Button label="Se connecter" onPress={handleLogin} loading={loading} fullWidth size="lg" style={styles.submitBtn} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: colors.background },
  scroll:    { flexGrow: 1, paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[12], paddingBottom: spacing[8], justifyContent: 'center' },
  hero:      { alignItems: 'center', marginBottom: spacing[10], gap: spacing[3] },
  logoMark:  { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primarySurface, borderWidth: 1.5, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  brand:     { fontFamily: fontFamily.display, fontSize: fontSize['3xl'], color: colors.textPrimary, letterSpacing: -1 },
  tagline:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  form:      { gap: spacing[1] },
  formTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, marginBottom: spacing[5], letterSpacing: -0.5 },
  submitBtn: { marginTop: spacing[3] },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[8] },
  footerText:{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  footerLink:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
});
