/**
 * ProfileScreen — profil utilisateur client.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Switch, StyleSheet,
} from 'react-native';
import {
  User, Mail, Phone, CalendarDays, ShieldCheck,
  LogOut, Info, FileText, ChevronRight, KeyRound,
} from 'lucide-react-native';
import { usersApi }     from '@api/endpoints/users';
import { authApi }      from '@api/endpoints/auth';
import { useApi }       from '@hooks/useApi';
import { useAuthStore } from '@store/authStore';
import { tokenStorage } from '@services/tokenStorage';
import { Avatar }       from '@components/ui/Avatar';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { LoadingState } from '@components/ui/LoadingState';
import { Separator }    from '@components/ui/Separator';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate }              from '@utils/formatters';

export const ProfileScreen: React.FC = () => {
  const { user, logout }                    = useAuthStore();
  const { data: profile, execute: fetchMe } = useApi(usersApi.getMe);
  const [twoFaEnabled, setTwoFaEnabled]     = useState(false);
  const [logoutLoading, setLogoutLoading]   = useState(false);

  React.useEffect(() => {
    if (profile) setTwoFaEnabled((profile as any).twoFaEnabled ?? false);
  }, [profile]);

  const load = useCallback(() => fetchMe(), [fetchMe]);
  useEffect(() => { load(); }, [load]);

  const displayUser    = profile ?? user;
  const isProfileReady = Boolean(profile);

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
          finally { setLogoutLoading(false); logout(); }
        },
      },
    ]);
  };

  const handleSetup2FA = async () => {
    try {
      const { data: res } = await authApi.setup2FA();
      const setup = (res as any).data;
      Alert.alert(
        'Configuration 2FA',
        `Secret : ${setup.secret}\n\nScannez le QR avec Google Authenticator ou Authy, puis activez la 2FA.`,
        [{ text: 'OK' }],
      );
    } catch {
      Alert.alert('Erreur', "Impossible d'initialiser la 2FA.");
    }
  };

  if (!displayUser || !isProfileReady) {
    return <LoadingState message="Chargement du profil…" />;
  }

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
          <Text style={styles.phone}>{displayUser.phone}</Text>
        )}
      </View>

      {/* Compte */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Mon compte</Text>
        <MenuRow Icon={User}         label="Nom complet"    value={displayUser.fullName} />
        <Separator marginV={spacing[3]} />
        <MenuRow Icon={Mail}         label="Email"          value={displayUser.email} />
        <Separator marginV={spacing[3]} />
        <MenuRow Icon={Phone}        label="Téléphone"      value={displayUser.phone ?? 'Non renseigné'} />
        <Separator marginV={spacing[3]} />
        <MenuRow Icon={CalendarDays} label="Membre depuis"  value={formatDate(displayUser.createdAt)} />
      </Card>

      {/* Sécurité */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Sécurité</Text>
        <View style={styles.menuRow}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primarySurface, borderColor: colors.borderPrimary }]}>
              <KeyRound size={16} color={colors.primary} strokeWidth={1.8} />
            </View>
            <View>
              <Text style={styles.menuLabel}>Authentification 2FA</Text>
              <Text style={styles.menuSub}>Code TOTP (Google Authenticator)</Text>
            </View>
          </View>
          <Switch
            value={twoFaEnabled}
            onValueChange={async (v) => {
              if (v) await handleSetup2FA();
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
        <MenuRow Icon={Info}     label="Version"                    value="1.0.0" />
        <Separator marginV={spacing[3]} />
        <MenuRow Icon={ShieldCheck} label="Politique de confidentialité" value="›" tappable />
        <Separator marginV={spacing[3]} />
        <MenuRow Icon={FileText}  label="CGV"                       value="›" tappable />
      </Card>

      {/* Déconnexion */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogOut size={18} color={colors.danger} strokeWidth={2} />
        <Text style={styles.logoutText}>
          {logoutLoading ? 'Déconnexion…' : 'Se déconnecter'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.uid}>ID : {displayUser.id.slice(0, 8).toUpperCase()}</Text>
    </ScrollView>
  );
};

// ── MenuRow ───────────────────────────────────────────────────────────────────
const MenuRow: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  value: string;
  tappable?: boolean;
}> = ({ Icon, label, value, tappable }) => (
  <View style={styles.menuRow}>
    <View style={styles.menuLeft}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon size={15} color={colors.textSecondary} strokeWidth={1.8} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <View style={styles.menuRight}>
      <Text style={styles.menuValue} numberOfLines={1}>{value === '›' ? '' : value}</Text>
      {tappable && <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.8} />}
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[12] },
  hero: {
    alignItems:    'center',
    paddingTop:    spacing[10],
    paddingBottom: spacing[6],
    gap:           spacing[2],
  },
  fullName: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.6,
    marginTop:     spacing[2],
  },
  email: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  phone: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },

  section: { marginBottom: spacing[4], gap: 0 },
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
  menuRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[1],
    maxWidth:      '50%',
  },
  iconBox: {
    width:           30,
    height:          30,
    borderRadius:    radius.md,
    borderWidth:     1,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
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
    textAlign:  'right',
  },

  logoutBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[3],
    marginTop:       spacing[2],
    marginBottom:    spacing[3],
    paddingVertical: spacing[4],
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  logoutText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.base,
    color:      colors.danger,
  },
  uid: {
    textAlign:  'center',
    fontFamily: fontFamily.mono,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
});
