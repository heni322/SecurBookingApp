/**
 * ProfileScreen — profil utilisateur client avec gestion du compte.
 * Sections : infos · 2FA · déconnexion
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Switch, StyleSheet,
} from 'react-native';
import { usersApi }  from '@api/endpoints/users';
import { authApi }   from '@api/endpoints/auth';
import { useApi }    from '@hooks/useApi';
import { useAuthStore } from '@store/authStore';
import { tokenStorage } from '@services/tokenStorage';
import { Avatar }    from '@components/ui/Avatar';
import { Card }      from '@components/ui/Card';
import { Button }    from '@components/ui/Button';
import { Separator } from '@components/ui/Separator';
import { colors }    from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate }              from '@utils/formatters';

export const ProfileScreen: React.FC = () => {
  const { user, logout }                       = useAuthStore();
  const { data: profile, execute: fetchMe }    = useApi(usersApi.getMe);
  const [twoFaEnabled, setTwoFaEnabled]        = useState(false);
  const [logoutLoading, setLogoutLoading]      = useState(false);

  const load = useCallback(() => fetchMe(), [fetchMe]);
  useEffect(() => { load(); }, [load]);

  const displayUser = profile ?? user;

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text:  'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          setLogoutLoading(true);
          try {
            const rt = tokenStorage.getRefreshToken();
            if (rt) await authApi.logout(rt);
          } catch { /* silent */ }
          finally {
            setLogoutLoading(false);
            logout();
          }
        },
      },
    ]);
  };

  const handleSetup2FA = async () => {
    try {
      const { data: res } = await authApi.setup2FA();
      Alert.alert(
        'Configuration 2FA',
        `Secret : ${res.data.secret}\n\nScannez le QR avec Google Authenticator ou Authy, puis activez la 2FA depuis les paramètres de sécurité.`,
        [{ text: 'OK' }],
      );
    } catch {
      Alert.alert('Erreur', 'Impossible d\'initialiser la 2FA.');
    }
  };

  if (!displayUser) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar hero */}
      <View style={styles.hero}>
        <Avatar
          fullName={displayUser.fullName}
          avatarUrl={displayUser.avatarUrl}
          size="xl"
        />
        <Text style={styles.fullName}>{displayUser.fullName}</Text>
        <Text style={styles.email}>{displayUser.email}</Text>
        {displayUser.phone && (
          <Text style={styles.phone}>📱 {displayUser.phone}</Text>
        )}
      </View>

      {/* Compte */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Mon compte</Text>
        <MenuRow icon="👤" label="Nom complet"  value={displayUser.fullName} />
        <Separator marginV={spacing[3]} />
        <MenuRow icon="✉️"  label="Email"        value={displayUser.email} />
        <Separator marginV={spacing[3]} />
        <MenuRow icon="📱" label="Téléphone"    value={displayUser.phone ?? 'Non renseigné'} />
        <Separator marginV={spacing[3]} />
        <MenuRow icon="📅" label="Membre depuis" value={formatDate(displayUser.createdAt)} />
      </Card>

      {/* Sécurité */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Sécurité</Text>
        <View style={styles.menuRow}>
          <View style={styles.menuLeft}>
            <Text style={styles.menuIcon}>🔐</Text>
            <View>
              <Text style={styles.menuLabel}>Authentification 2FA</Text>
              <Text style={styles.menuSub}>Code TOTP (Google Authenticator)</Text>
            </View>
          </View>
          <Switch
            value={twoFaEnabled}
            onValueChange={async (v) => {
              if (v) {
                await handleSetup2FA();
              }
              setTwoFaEnabled(v);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      {/* À propos */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        <MenuRow icon="📋" label="Version"    value="1.0.0" />
        <Separator marginV={spacing[3]} />
        <MenuRow icon="🔒" label="Politique de confidentialité" value="›" />
        <Separator marginV={spacing[3]} />
        <MenuRow icon="📄" label="CGV"        value="›" />
      </Card>

      {/* Déconnexion */}
      <Button
        label={logoutLoading ? 'Déconnexion…' : 'Se déconnecter'}
        onPress={handleLogout}
        loading={logoutLoading}
        variant="danger"
        fullWidth
        size="lg"
        style={styles.logoutBtn}
      />

      <Text style={styles.uid}>ID : {displayUser.id.slice(0, 8).toUpperCase()}</Text>
    </ScrollView>
  );
};

const MenuRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon, label, value,
}) => (
  <View style={styles.menuRow}>
    <View style={styles.menuLeft}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <Text style={styles.menuValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[12],
  },
  hero: {
    alignItems:   'center',
    paddingTop:   spacing[10],
    paddingBottom: spacing[6],
    gap:          spacing[2],
  },
  fullName: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.6,
    marginTop:     spacing[2],
  },
  email: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
  },
  phone: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  section: {
    marginBottom: spacing[4],
    gap:          0,
  },
  sectionTitle: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  spacing[4],
  },
  menuRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            spacing[3],
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[3],
    flex:          1,
  },
  menuIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  menuLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  menuSub: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  menuValue: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    maxWidth:   '45%',
    textAlign:  'right',
  },
  logoutBtn: { marginTop: spacing[2], marginBottom: spacing[3] },
  uid: {
    textAlign:  'center',
    fontFamily: fontFamily.mono,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
});
