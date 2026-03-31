/**
 * RegisterScreen — création de compte client.
 * Icônes : lucide-react-native
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, User, Building2, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import { authApi }      from '@api/endpoints/auth';
import { useAuthStore } from '@store/authStore';
import { Button }  from '@components/ui/Button';
import { Input }   from '@components/ui/Input';
import { colors }  from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AuthStackParamList, AuthTokens, User as UserModel } from '@models/index';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [clientType, setClientType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  const { hydrate } = useAuthStore();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim())           e.fullName = 'Nom complet requis';
    if (!email.trim())              e.email    = 'Email requis';
    if (!/\S+@\S+\.\S+/.test(email)) e.email  = 'Email invalide';
    if (password.length < 8)        e.password = '8 caractères minimum';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: res } = await authApi.register({
        fullName:   fullName.trim(),
        email:      email.trim().toLowerCase(),
        password,
        phone:      phone.trim() || undefined,
        role:       'CLIENT' as const,
        clientType,
      });
      const { user, accessToken, refreshToken } = (res as any).data as {
        user: UserModel; accessToken: string; refreshToken: string;
      };
      const tokens: AuthTokens = { accessToken, refreshToken, expiresIn: 900 };
      hydrate(user, tokens);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors de la création du compte';
      Alert.alert('Inscription impossible', message);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez SecurBook en tant que client</Text>
        </View>

        {/* Type de client */}
        <View style={styles.typeRow}>
          {([
            { type: 'INDIVIDUAL', label: 'Particulier', Icon: User     },
            { type: 'COMPANY',    label: 'Entreprise',  Icon: Building2 },
          ] as const).map(({ type, label, Icon }) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, clientType === type && styles.typeBtnActive]}
              onPress={() => setClientType(type)}
            >
              <Icon
                size={24}
                color={clientType === type ? colors.primary : colors.textSecondary}
                strokeWidth={1.8}
              />
              <Text style={[styles.typeLabel, clientType === type && styles.typeLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Nom complet"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder="Jean Dupont"
            error={errors.fullName}
            leftIcon={<User size={16} color={colors.textMuted} strokeWidth={1.8} />}
          />
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
            label="Téléphone (optionnel)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+33 6 00 00 00 00"
            leftIcon={<Phone size={16} color={colors.textMuted} strokeWidth={1.8} />}
          />
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholder="8 caractères minimum"
            error={errors.password}
            leftIcon={<Lock size={16} color={colors.textMuted} strokeWidth={1.8} />}
            rightIcon={
              showPass
                ? <EyeOff size={18} color={colors.textMuted} strokeWidth={1.8} />
                : <Eye    size={18} color={colors.textMuted} strokeWidth={1.8} />
            }
            onRightPress={() => setShowPass((v) => !v)}
          />

          <Button
            label="Créer mon compte"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà inscrit ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Se connecter</Text>
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
    paddingTop:        spacing[8],
    paddingBottom:     spacing[8],
  },
  header: {
    marginBottom: spacing[6],
    gap:          spacing[2],
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing[3],
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
  },
  typeRow: {
    flexDirection: 'row',
    gap:           spacing[3],
    marginBottom:  spacing[6],
  },
  typeBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing[4],
    borderRadius:    14,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing[2],
  },
  typeBtnActive: {
    borderColor:     colors.primary,
    backgroundColor: colors.primarySurface,
  },
  typeLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
  },
  typeLabelActive: { color: colors.primary },
  form:            { gap: spacing[1] },
  submitBtn:       { marginTop: spacing[3] },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      spacing[6],
  },
  footerText: { fontFamily: fontFamily.body,         fontSize: fontSize.sm, color: colors.textSecondary },
  footerLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
});
