/**
 * PartnerTeamScreen — Agents de l'équipe partenaire.
 */
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePartnerT } from './_partnerI18n';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CircleCheckBig, Clock, XCircle, TriangleAlert,
  ChevronRight, Star, Shield, Users, Search, X,
} from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { partnerApi }   from '@api/endpoints/partner';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Badge }        from '@components/ui/Badge';
import { Avatar }       from '@components/ui/Avatar';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState }   from '@components/ui/EmptyState';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { PartnerAgent, PartnerStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<PartnerStackParamList>;

const MANDATORY_DOCS = ['CARTE_PRO_CNAPS', 'CIN', 'PHOTO', 'RIB', 'CARTE_VITALE', 'SST'];

type FilterTab = 'all' | 'validated' | 'pending' | 'alerts';

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function agentAlerts(agent: PartnerAgent) {
  const docs = agent.agentProfile?.documents ?? [];
  const rejected  = docs.filter(d => d.status === 'REJECTED').length;
  const missing   = MANDATORY_DOCS.filter(t => !docs.some(d => d.type === t && d.status === 'APPROVED')).length;
  const expiring  = docs.filter(d => {
    if (d.status !== 'APPROVED') return false;
    const days = daysUntil(d.expiresAt);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  return { rejected, missing, expiring, total: rejected + missing + expiring };
}

const AgentCard: React.FC<{ agent: PartnerAgent; onPress: () => void }> = ({ agent, onPress }) => {
  const { t } = usePartnerT();
  const profile = agent.agentProfile;
  const docs    = profile?.documents ?? [];
  const { rejected, missing, expiring } = agentAlerts(agent);
  const pendingDocs = docs.filter(d => d.status === 'PENDING').length;
  const hasAlerts   = rejected > 0 || missing > 0 || expiring > 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={hasAlerts ? [styles.agentCard, styles.agentCardAlert] : [styles.agentCard]}>
        <View style={styles.cardTop}>
          <Avatar fullName={agent.fullName} size="md" />
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>{agent.fullName}</Text>
            <Text style={styles.agentEmail} numberOfLines={1}>{agent.email}</Text>
            {profile?.city && <Text style={styles.agentCity}>{profile.city}</Text>}
          </View>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
        </View>

        <View style={styles.statsRow}>
          {profile?.isValidated ? (
            <View style={[styles.pill, styles.pillGreen]}>
              <CircleCheckBig size={11} color={colors.success} strokeWidth={2.5} />
              <Text style={[styles.pillTxt, { color: colors.success }]}>{t('team.pills.cnapsValidated')}</Text>
            </View>
          ) : (
            <View style={[styles.pill, styles.pillOrange]}>
              <Clock size={11} color={colors.warning} strokeWidth={2.5} />
              <Text style={[styles.pillTxt, { color: colors.warning }]}>{t('team.pills.cnapsNotValidated')}</Text>
            </View>
          )}
          {(profile?.averageRating ?? 0) > 0 && (
            <View style={[styles.pill, styles.pillGold]}>
              <Star size={11} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.pillTxt, { color: colors.accent }]}>{profile!.averageRating!.toFixed(1)}</Text>
            </View>
          )}
          {(profile?.totalMissions ?? 0) > 0 && (
            <View style={styles.pill}>
              <Shield size={11} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.pillTxt, { color: colors.primary }]}>
                {t('team.pills.missions', { count: profile?.totalMissions })}
              </Text>
            </View>
          )}
        </View>

        {rejected > 0    && <AlertRow icon="reject"  count={rejected}    label={t('team.alerts.rejected',  { count: rejected })} />}
        {missing > 0     && <AlertRow icon="missing" count={missing}     label={t('team.alerts.missing',   { count: missing })} />}
        {expiring > 0    && <AlertRow icon="expiry"  count={expiring}    label={t('team.alerts.expiring',  { count: expiring })} />}
        {pendingDocs > 0 && !hasAlerts && <AlertRow icon="pending" count={pendingDocs} label={t('team.alerts.pending', { count: pendingDocs })} />}
      </Card>
    </TouchableOpacity>
  );
};

const AlertRow: React.FC<{ icon: 'reject' | 'missing' | 'expiry' | 'pending'; count: number; label: string }> = ({ icon, label }) => {
  const { color, Icon } = {
    reject:  { color: colors.danger,  Icon: XCircle },
    missing: { color: colors.warning, Icon: TriangleAlert },
    expiry:  { color: colors.warning, Icon: TriangleAlert },
    pending: { color: colors.primary, Icon: Clock },
  }[icon];
  return (
    <View style={styles.alertRow}>
      <Icon size={12} color={color} strokeWidth={2} />
      <Text style={[styles.alertTxt, { color }]}>{label}</Text>
    </View>
  );
};

export const PartnerTeamScreen: React.FC = () => {
  const navigation  = useNavigation<Nav>();
  const { t } = usePartnerT();
  const [agents,    setAgents]    = useState<PartnerAgent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [search,    setSearch]    = useState('');
  const [tab,       setTab]       = useState<FilterTab>('all');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await partnerApi.getAgents();
      setAgents((res.data as any)?.data ?? res.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    all:       agents.length,
    validated: agents.filter(a => a.agentProfile?.isValidated).length,
    pending:   agents.filter(a => !a.agentProfile?.isValidated).length,
    alerts:    agents.filter(a => agentAlerts(a).total > 0).length,
  }), [agents]);

  const filtered = useMemo(() => {
    let list = agents;
    if (tab === 'validated') list = list.filter(a => a.agentProfile?.isValidated);
    if (tab === 'pending')   list = list.filter(a => !a.agentProfile?.isValidated);
    if (tab === 'alerts')    list = list.filter(a => agentAlerts(a).total > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.agentProfile?.city ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [agents, tab, search]);

  const TABS: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'all',       label: t('team.filters.all'),       count: stats.all,       color: colors.primary },
    { key: 'validated', label: t('team.filters.validated'), count: stats.validated, color: colors.success },
    { key: 'pending',   label: t('team.filters.pending'),   count: stats.pending,   color: colors.warning },
    { key: 'alerts',    label: t('team.filters.alerts'),    count: stats.alerts,    color: colors.danger  },
  ];

  if (loading && !agents.length) return <LoadingState message={t('team.loading')} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('team.title')}
        subtitle={t(filtered.length === 1 ? 'team.subtitle_one' : 'team.subtitle_other', { count: filtered.length })}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Search size={15} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('team.search.placeholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[styles.tabChip, tab === tb.key && { backgroundColor: tb.color + '20', borderColor: tb.color }]}
            onPress={() => setTab(tb.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, tab === tb.key && { color: tb.color }]}>{tb.label}</Text>
            <View style={[styles.tabBadge, { backgroundColor: tab === tb.key ? tb.color : colors.border }]}>
              <Text style={styles.tabBadgeTxt}>{tb.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {agents.length === 0 ? (
        <EmptyState Icon={Users} title={t('team.empty.noAgentsTitle')} subtitle={t('team.empty.noAgentsSubtitle')} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyFiltered}>
          <Text style={styles.emptyFilteredTxt}>
            {search ? t('team.empty.noResultsBySearch', { search }) : t('team.empty.noResultsByFilter')}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={a => a.id}
          renderItem={({ item }) => (
            <AgentCard
              agent={item}
              onPress={() => navigation.navigate('PartnerAgentDetail', {
                agentId:   item.agentProfile?.id ?? item.id,
                agentName: item.fullName,
              })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list:   { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[10], gap: spacing[3], paddingTop: spacing[2] },
  searchContainer: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[3], paddingBottom: spacing[2] },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textPrimary, padding: 0 },
  tabRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[3] },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary },
  tabBadge:    { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeTxt: { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: '#fff' },
  agentCard:      { gap: spacing[3] },
  agentCardAlert: { borderColor: colors.warning + '60', borderWidth: 1 },
  cardTop:        { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  agentName:      { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  agentEmail:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  agentCity:      { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 3, borderWidth: 1, borderColor: colors.borderPrimary },
  pillGreen:{ backgroundColor: colors.successSurface, borderColor: colors.success + '55' },
  pillOrange:{ backgroundColor: colors.warningSurface, borderColor: colors.warning + '55' },
  pillGold: { backgroundColor: colors.accentSurface,   borderColor: colors.accent  + '55' },
  pillTxt:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  alertTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs },
  emptyFiltered:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
  emptyFilteredTxt: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textMuted, textAlign: 'center' },
});
