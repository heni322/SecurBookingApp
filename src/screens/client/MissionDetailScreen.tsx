/**
 * MissionDetailScreen — full mission view.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar, Clock, MapPin, Radio, Banknote,
  CalendarDays, MessageSquare, FileText, ChevronRight, Zap,
} from 'lucide-react-native';
import { missionsApi }  from '@api/endpoints/missions';
import { useApi }       from '@hooks/useApi';
import { BookingCard }  from '@components/domain/BookingCard';
import { Badge }        from '@components/ui/Badge';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }    from '@components/ui/Separator';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatMissionRange, formatCurrency, formatDate } from '@utils/formatters';
import { MISSION_STATUS_LABEL, MISSION_STATUS_COLOR }     from '@utils/statusHelpers';
import { isCancellableMission } from '@utils/typeGuards';
import { MissionStatus }        from '@constants/enums';
import type { MissionStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionDetail'>;

export const MissionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation('missions');
  const { missionId } = route.params;
  const { data: mission, loading, execute, error } = useApi(missionsApi.getById);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleCancel = () => {
    Alert.alert(
      t('detail.cancel_title'),
      t('detail.cancel_body'),
      [
        { text: t('detail.cancel_back'), style: 'cancel' },
        {
          text: t('detail.cancel_confirm'), style: 'destructive',
          onPress: async () => {
            try { await missionsApi.cancel(missionId); load(); }
            catch (e: unknown) {
              Alert.alert(t('detail.cancel_title'), (e as any)?.response?.data?.message ?? t('detail.cancel_error'));
            }
          },
        },
      ],
    );
  };

  if (loading && !mission) return <LoadingState message={t('detail.loading')} />;
  if (error || !mission) return (
    <View style={styles.screen}>
      <ScreenHeader title={t('detail.screen_title')} onBack={() => navigation.goBack()} />
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{t('detail.error_load')}</Text>
        <Button label={t('detail.retry')} onPress={load} variant="ghost" />
      </View>
    </View>
  );

  const statusLabel = MISSION_STATUS_LABEL[mission.status] ?? mission.status;
  const statusColor = MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted;
  const canCancel   = isCancellableMission(mission);
  const hasQuote    = Boolean(mission.quote);
  const bookings    = mission.bookings ?? [];
  const openBookings = bookings.filter(b => b.status === 'OPEN');
  const hasApplications = openBookings.some(b => (b.applications?.length ?? 0) > 0);
  const displayTitle = mission.title?.trim() || `Mission — ${mission.city}`;

  const cta = (() => {
    if (mission.status === MissionStatus.DRAFT && !hasQuote)
      return { label: t('detail.cta_get_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.DRAFT && hasQuote)
      return { label: t('detail.cta_see_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.CONFIRMED)
      return { label: t('detail.cta_pay'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.PUBLISHED && hasApplications)
      return { label: t('detail.cta_select'), onPress: () => { const b = openBookings.find(bk => (bk.applications?.length ?? 0) > 0); if (b) navigation.navigate('BookingDetail', { bookingId: b.id }); } };
    if (mission.status === MissionStatus.PUBLISHED)
      return { label: t('detail.cta_waiting'), onPress: () => {} };
    if (mission.status === MissionStatus.COMPLETED)
      return { label: t('detail.cta_messaging'), onPress: () => navigation.navigate('Conversation', { missionId }) };
    return null;
  })();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('detail.screen_title')}
        onBack={() => navigation.goBack()}
        rightAction={
          (mission.status === MissionStatus.PUBLISHED || mission.status === MissionStatus.IN_PROGRESS) ? (
            <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Conversation', { missionId })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MessageSquare size={20} color={colors.primary} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>

        {/* Hero banner */}
        <View style={[styles.heroBanner, { borderLeftColor: statusColor }]}>
          <View style={styles.heroTop}>
            <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
            {mission.isUrgent && (
              <View style={styles.urgencyBadge}>
                <Zap size={11} color={colors.warning} strokeWidth={2.2} />
                <Text style={styles.urgencyText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{displayTitle}</Text>
          <View style={styles.heroMeta}>
            <MapPin size={13} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.heroCity}>{mission.city}</Text>
            <Text style={styles.heroDot}>·</Text>
            <Calendar size={13} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.heroDate}>{formatMissionRange(mission.startAt, mission.endAt)}</Text>
          </View>
        </View>

        {/* Info grid */}
        <Card elevated style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <InfoTile Icon={Clock}       label={t('detail.duration')}  value={`${mission.durationHours}h`} />
            <InfoTile Icon={Radio}       label="Rayon"                  value={`${mission.radiusKm} km`} />
            {mission.quote && <InfoTile Icon={Banknote} label="Total TTC" value={formatCurrency(mission.quote.totalWithVat * 100)} accent />}
            <InfoTile Icon={CalendarDays} label={t('detail.created_on')} value={formatDate(mission.createdAt)} />
          </View>
          {(mission.address || mission.city) && (
            <>
              <Separator marginV={spacing[3]} />
              <View style={styles.addressRow}>
                <MapPin size={14} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.addressText}>{[mission.address, mission.city, mission.zipCode].filter(Boolean).join(', ')}</Text>
              </View>
            </>
          )}
        </Card>

        {/* Notes */}
        {mission.notes && (
          <Card style={styles.notesCard}>
            <View style={styles.sectionLabelRow}>
              <FileText size={13} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.sectionLabel}>Notes & instructions</Text>
            </View>
            <Text style={styles.notesText}>{mission.notes}</Text>
          </Card>
        )}

        {/* Bookings */}
        {bookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Postes</Text>
              <View style={styles.countPill}><Text style={styles.countText}>{bookings.length}</Text></View>
            </View>
            {bookings.map(b => (
              <BookingCard key={b.id} booking={b} perspective="client" onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })} />
            ))}
          </View>
        )}

        {/* CTA */}
        {cta && (
          <View style={styles.ctaArea}>
            <Button label={cta.label} onPress={cta.onPress} fullWidth size="lg"
              rightIcon={<ChevronRight size={18} color={colors.textInverse} strokeWidth={2} />}
              disabled={mission.status === MissionStatus.PUBLISHED && !hasApplications} />
          </View>
        )}
        {canCancel && (
          <Button label={t('detail.cancel')} onPress={handleCancel} fullWidth variant="danger" size="sm" style={styles.cancelBtn} />
        )}
      </ScrollView>
    </View>
  );
};

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;
const InfoTile: React.FC<{ Icon: LucideIcon; label: string; value: string; accent?: boolean }> = ({ Icon, label, value, accent }) => (
  <View style={tileStyles.wrap}>
    <Icon size={14} color={accent ? colors.primary : colors.textMuted} strokeWidth={1.8} />
    <Text style={tileStyles.label}>{label}</Text>
    <Text style={[tileStyles.value, accent && { color: colors.primary }]}>{value}</Text>
  </View>
);
const tileStyles = StyleSheet.create({
  wrap:  { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: spacing[3], gap: spacing[1] },
  label: { fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
});

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  flex:        { flex: 1 },
  content:     { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[12], gap: spacing[4] },
  errorWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  errorText:   { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },
  chatBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroBanner:  { marginTop: spacing[4], paddingLeft: spacing[4], borderLeftWidth: 3, borderLeftColor: colors.primary, gap: spacing[2] },
  heroTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  urgencyBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warningSurface, borderRadius: radius.full, paddingHorizontal: spacing[2] + 2, paddingVertical: 3, borderWidth: 1, borderColor: colors.warning },
  urgencyText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.warning, letterSpacing: 0.5 },
  title:       { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6 },
  heroMeta:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  heroCity:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  heroDot:     { color: colors.border },
  heroDate:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  infoCard:    { gap: spacing[2] },
  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  addressRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  addressText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  notesCard:   { gap: spacing[3] },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionLabel:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  notesText:   { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, lineHeight: fontSize.base * 1.6 },
  section:     { gap: spacing[3] },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  sectionAccent:{ width: 3, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle:{ fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3, flex: 1 },
  countPill:   { backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 3, borderWidth: 1, borderColor: colors.borderPrimary },
  countText:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },
  ctaArea:     { marginTop: spacing[2] },
  cancelBtn:   { marginTop: spacing[2], opacity: 0.8 },
});