/**
 * LoginScreen — authentification client.
 * Icônes : lucide-react-native
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react-native';
import { authApi }      from '@api/endpoints/auth';
import { tokenStorage } from '@services/tokenStorage';
import { useAuthStore } from '@store/authStore';
import { Button }  from '@components/ui/Button';
import { Input }   from '@components/ui/Input';
import { colors }  from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AuthStackParamList, AuthTokens, User } from '@models/index';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [need2FA,   setNeed2FA]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const { hydrate } = useAuthStore();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim())                  e.email    = 'Email requis';
    if (!password)                      e.password = 'Mot de passe requis';
    if (!/\S+@\S+\.\S+/.test(email))   e.email    = 'Email invalide';
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
        ...(need2FA && twoFaCode ? { twoFaCode } : {}),
      });
      const { user, accessToken, refreshToken } = (res as any).data as {
        user: User; accessToken: string; refreshToken: string;
      };
      const tokens: AuthTokens = { accessToken, refreshToken, expiresIn: 900 };
      hydrate(user, tokens);
    } catch (err: unknown) {
      const status  = (err as { response?: { status?: number } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur de connexion';
      if (status === 400 && message.toLowerCase().includes('2fa')) {
        setNeed2FA(true);
      } else {
        Alert.alert('Connexion impossible', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.formTitle}>
            {need2FA ? 'Vérification 2FA' : 'Connexion'}
          </Text>

          {!need2FA ? (
            <>
              <Input
                label="Adresse email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="vous@exemple.com"
                error={errors.email}
                leftIcon={<Mail size={16} color={colors.textMuted} strokeWidth={1.8} />}
              />
              <Input
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoComplete="password"
                placeholder="••••••••"
                error={errors.password}
                leftIcon={<Lock size={16} color={colors.textMuted} strokeWidth={1.8} />}
                rightIcon={
                  showPass
                    ? <EyeOff size={18} color={colors.textMuted} strokeWidth={1.8} />
                    : <Eye    size={18} color={colors.textMuted} strokeWidth={1.8} />
                }
                onRightPress={() => setShowPass((v) => !v)}
              />
            </>
          ) : (
            <>
              <Text style={styles.twoFaHint}>
                Entrez le code à 6 chiffres de votre application d'authentification.
              </Text>
              <Input
                label="Code 2FA"
                value={twoFaCode}
                onChangeText={setTwoFaCode}
                keyboardType="number-pad"
                placeholder="123456"
                maxLength={6}
                leftIcon={<KeyRound size={16} color={colors.textMuted} strokeWidth={1.8} />}
              />
            </>
          )}

          <Button
            label={need2FA ? 'Vérifier' : 'Se connecter'}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />

          {need2FA && (
            <TouchableOpacity onPress={() => setNeed2FA(false)} style={styles.linkRow}>
              <Text style={styles.link}>← Retour</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
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
  flex:   { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow:          1,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[12],
    paddingBottom:     spacing[8],
    justifyContent:    'center',
  },
  hero: {
    alignItems:   'center',
    marginBottom: spacing[10],
    gap:          spacing[2],
  },
  logoMark: {
    width:           80,
    height:          80,
    borderRadius:    24,
    backgroundColor: colors.primarySurface,
    borderWidth:     1.5,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing[2],
  },
  brand: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['3xl'],
    color:         colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily:    fontFamily.body,
    fontSize:      fontSize.sm,
    color:         colors.textSecondary,
    letterSpacing: 0.3,
  },
  form:      { gap: spacing[1] },
  formTitle: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.xl,
    color:         colors.textPrimary,
    marginBottom:  spacing[5],
    letterSpacing: -0.5,
  },
  twoFaHint: {
    fontFamily:   fontFamily.body,
    fontSize:     fontSize.sm,
    color:        colors.textSecondary,
    lineHeight:   fontSize.sm * 1.6,
    marginBottom: spacing[4],
  },
  submitBtn: { marginTop: spacing[3] },
  linkRow:   { alignItems: 'center', marginTop: spacing[3] },
  link: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.primary,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      spacing[8],
  },
  footerText: { fontFamily: fontFamily.body,         fontSize: fontSize.sm, color: colors.textSecondary },
  footerLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
});
