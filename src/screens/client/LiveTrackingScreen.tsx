/**
 * LiveTrackingScreen — Real-time agent tracking (CLIENT app).
 *
 * Architecture:
 *  • useSocketTracking hook owns ALL socket logic — screen is purely UI
 *  • Camera follow uses a ref (not state) — prevents listener re-registration
 *  • Heading uses Animated.Value interpolated on the marker's transform
 *  • Signal-lost banner: shown when no GPS update > 30 s while connected
 *  • Geofence alert: auto-dismissed on zone re-entry via inZone state
 *  • OSM tiles (free, no key) — Google Maps on Android, MapKit on iOS
 *  • "Follow agent" / "View site" / "Sync" controls
 *  • Pulsing geofence ring animation
 *  • Last known position shown at reduced opacity when signal lost
 */

import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Vibration,
} from 'react-native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { G, Circle as SvgCircle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Navigation2, MapPin, Wifi, WifiOff,
  AlertTriangle, CheckCircle2, Target, RefreshCw,
  WifiOff as SignalIcon,
} from 'lucide-react-native';
import { useTranslation }       from 'react-i18next';
import { ScreenHeader }         from '@components/ui';
import { colors, palette }      from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { socketService }        from '@services/socketService';
import { useSocketTracking }    from '@hooks/useSocketTracking';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'LiveTracking'>;

const GEOFENCE_RADIUS_M = 30;
const OSM_TILE_URL      = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface AgentMarkerProps {
  initials:   string;
  heading:    number | null;
  inZone:     boolean;
  signalLost: boolean;
}

const AgentMarker: React.FC<AgentMarkerProps> = ({ initials, heading, inZone, signalLost }) => {
  const bubbleColor = signalLost ? palette.white30 : (inZone ? palette.azure : palette.crimson);
  const size = 56;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: signalLost ? 0.5 : 1 }}>
      <Svg width={size} height={size} viewBox="0 0 56 56">
        {heading !== null && heading >= 0 && (
          <G rotation={heading} origin="28,28">
            <Path d="M28 12 L24 26 L28 22 L32 26 Z" fill={bubbleColor} opacity="0.8" />
          </G>
        )}
        <SvgCircle cx="28" cy="28" r="16" fill={bubbleColor} />
        <SvgCircle cx="28" cy="28" r="16" fill="none" stroke="#fff" strokeWidth="3" />
        {!signalLost && (
          <SvgCircle cx="40" cy="16" r="5" fill={inZone ? palette.emerald : palette.gold} />
        )}
      </Svg>
      <View style={{ position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: '#fff' }}>
          {initials}
        </Text>
      </View>
    </View>
  );
};

export default function LiveTrackingScreen({ navigation, route }: Props) {
  const {
    missionId, bookingId, agentName,
    missionAddress, siteLat, siteLng,
  } = route.params;

  const { t } = useTranslation('tracking');

  const mapRef       = useRef<MapView>(null);
  const followingRef = useRef(true);
  const [showFollowBtn, setShowFollowBtn] = useState(false);

  const {
    agentPosition, lastSeenLabel, connected, signalLost,
    distanceM, inZone, pendingAlert, dismissAlert,
  } = useSocketTracking({
    missionId,
    bookingId,
    onMissionEnd: () => navigation.goBack(),
  });

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const alertSlide = useRef(new Animated.Value(-160)).current;
  const headingRef = useRef<number>(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (pendingAlert) {
      Vibration.vibrate([0, 250, 100, 250]);
      Animated.spring(alertSlide, {
        toValue: 0, friction: 8, tension: 80, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(alertSlide, {
        toValue: -160, duration: 220, useNativeDriver: true,
      }).start();
    }
  }, [pendingAlert, alertSlide]);

  useEffect(() => {
    if (inZone && pendingAlert) dismissAlert();
  }, [inZone, pendingAlert, dismissAlert]);

  const animateToAgent = useCallback(() => {
    if (!agentPosition || !mapRef.current) return;
    mapRef.current.animateCamera({
      center:  { latitude: agentPosition.latitude, longitude: agentPosition.longitude },
      zoom:    16,
      heading: headingRef.current,
    }, { duration: 700 });
  }, [agentPosition]);

  useEffect(() => {
    if (!followingRef.current || !agentPosition) return;
    headingRef.current = agentPosition.heading ?? 0;
    animateToAgent();
  }, [agentPosition, animateToAgent]);

  const handleReCenter = useCallback(() => {
    followingRef.current = true;
    setShowFollowBtn(false);
    animateToAgent();
  }, [animateToAgent]);

  const handlePanDrag = useCallback(() => {
    if (followingRef.current) {
      followingRef.current = false;
      setShowFollowBtn(true);
    }
  }, []);

  const agentInitials = agentName
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const distanceLabel = distanceM !== null
    ? distanceM < 1000 ? `${distanceM} m` : `${(distanceM / 1000).toFixed(1)} km`
    : null;

  const statusText = !connected
    ? t('status_offline')
    : signalLost
      ? `⚠ Signal GPS`
      : agentPosition
        ? lastSeenLabel ?? t('status_live')
        : t('status_waiting');

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialCamera={{
          center:   { latitude: siteLat, longitude: siteLng },
          zoom:     16, heading: 0, pitch: 0, altitude: 0,
        }}
        onPanDrag={handlePanDrag}
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
        rotateEnabled={true}
        pitchEnabled={false}
      >
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
          shouldReplaceMapContent={Platform.OS === 'ios'}
        />
        <Circle
          center={{ latitude: siteLat, longitude: siteLng }}
          radius={GEOFENCE_RADIUS_M}
          fillColor={inZone ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.13)'}
          strokeColor={inZone ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)'}
          strokeWidth={2}
          zIndex={1}
        />
        {!inZone && (
          <Circle
            center={{ latitude: siteLat, longitude: siteLng }}
            radius={GEOFENCE_RADIUS_M * 2}
            fillColor="rgba(239,68,68,0.04)"
            strokeColor="rgba(239,68,68,0.25)"
            strokeWidth={1}
            zIndex={1}
          />
        )}
        {agentPosition && (agentPosition.accuracy ?? 0) > 0 && (
          <Circle
            center={{ latitude: agentPosition.latitude, longitude: agentPosition.longitude }}
            radius={Math.min(agentPosition.accuracy ?? 0, 150)}
            fillColor="rgba(59,130,246,0.08)"
            strokeColor="rgba(59,130,246,0.3)"
            strokeWidth={1}
            zIndex={2}
          />
        )}
        <Marker
          coordinate={{ latitude: siteLat, longitude: siteLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={3}
        >
          <View style={[styles.sitePin, !inZone && styles.sitePinAlert]}>
            <MapPin size={18} color="#fff" strokeWidth={2.5} />
          </View>
        </Marker>
        {agentPosition && (
          <Marker
            coordinate={{ latitude: agentPosition.latitude, longitude: agentPosition.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            zIndex={4}
          >
            <AgentMarker
              initials={agentInitials}
              heading={agentPosition.heading ?? null}
              inZone={inZone}
              signalLost={signalLost}
            />
          </Marker>
        )}
      </MapView>

      {/* OSM Attribution */}
      <View style={styles.attribution}>
        <Text style={styles.attributionTxt}>{t('attribution')}</Text>
      </View>

      {/* Connection status bar */}
      <View style={styles.statusBar}>
        {connected
          ? <Wifi    size={12} color={colors.success} strokeWidth={2} />
          : <WifiOff size={12} color={colors.danger}  strokeWidth={2} />
        }
        <Text style={[styles.statusTxt, !connected && styles.statusTxtOff]}>
          {statusText}
        </Text>
        {connected && !agentPosition && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        {signalLost && connected && (
          <SignalIcon size={12} color={colors.warning} strokeWidth={2} />
        )}
      </View>

      {/* Geofence alert banner */}
      <Animated.View
        style={[styles.alertBanner, { transform: [{ translateY: alertSlide }] }]}
        pointerEvents={pendingAlert ? 'auto' : 'none'}
      >
        <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>{t('out_of_zone')}</Text>
          <Text style={styles.alertBody} numberOfLines={1}>
            {pendingAlert
              ? `${pendingAlert.agentName} — ${pendingAlert.distanceStr}`
              : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismissAlert}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.alertClose}>✕</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Re-center FAB */}
      {showFollowBtn && (
        <TouchableOpacity
          style={styles.reCenterFab}
          onPress={handleReCenter}
          activeOpacity={0.8}
        >
          <Target size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* Bottom card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarTxt}>{agentInitials}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardName}>{agentName}</Text>
            <Text style={styles.cardAddress} numberOfLines={1}>{missionAddress}</Text>
          </View>
          {distanceLabel && (
            <View style={[styles.distBadge, !inZone && styles.distBadgeAlert]}>
              {inZone
                ? <CheckCircle2 size={12} color={colors.success} strokeWidth={2.5} />
                : <AlertTriangle size={12} color={colors.danger} strokeWidth={2.5} />
              }
              <Text style={[styles.distTxt, !inZone && styles.distTxtAlert]}>
                {distanceLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.zoneStrip, !inZone && styles.zoneStripAlert]}>
          <Text style={[styles.zoneTxt, !inZone && styles.zoneTxtAlert]}>
            {inZone
              ? `✓ ${t('in_zone')} (${GEOFENCE_RADIUS_M} m)`
              : `⚠ ${t('out_of_zone')}`}
          </Text>
        </View>

        <View style={styles.ctrlRow}>
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => {
              followingRef.current = false;
              setShowFollowBtn(true);
              mapRef.current?.animateCamera({
                center: { latitude: siteLat, longitude: siteLng },
                zoom: 17,
              }, { duration: 500 });
            }}
            activeOpacity={0.75}
          >
            <MapPin size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.ctrlTxt}>{t('view_site_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, styles.ctrlBtnPrimary, !agentPosition && styles.ctrlBtnDisabled]}
            onPress={handleReCenter}
            disabled={!agentPosition}
            activeOpacity={0.75}
          >
            <Navigation2 size={15} color="#fff" strokeWidth={2} />
            <Text style={[styles.ctrlTxt, styles.ctrlTxtPrimary]}>{t('follow_agent_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => socketService.joinMission(missionId)}
            activeOpacity={0.75}
          >
            <RefreshCw size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.ctrlTxt}>{t('sync_btn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.navy },

  attribution: {
    position: 'absolute', bottom: 290, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  attributionTxt: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: fontFamily.body },

  statusBar: {
    position: 'absolute', top: 68, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: 'rgba(10,12,15,0.88)',
    borderRadius: radius.full,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderWidth: 1, borderColor: palette.white10,
  },
  statusTxt:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.white, flex: 1 },
  statusTxtOff: { color: colors.danger },

  alertBanner: {
    position: 'absolute', top: 120, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.danger,
    borderRadius: radius.xl,
    padding: spacing[4],
    zIndex: 50,
    ...Platform.select({
      ios:     { shadowColor: colors.danger, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 14 },
      android: { elevation: 14 },
    }),
  },
  alertTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: '#fff', letterSpacing: -0.2 },
  alertBody:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  alertClose: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: 'rgba(255,255,255,0.75)' },

  sitePin:      { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  sitePinAlert: { backgroundColor: colors.danger },

  reCenterFab: {
    position: 'absolute', right: 16, bottom: 300,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: palette.navy80,
    borderWidth: 1, borderColor: palette.white10,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },

  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,12,15,0.97)',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing[5],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: palette.white10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.35, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },

  cardRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatarBubble: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: palette.azureDim,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarTxt:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: '#fff' },
  cardMeta:    { flex: 1 },
  cardName:    { fontFamily: fontFamily.display, fontSize: fontSize.base, color: palette.white, letterSpacing: -0.2 },
  cardAddress: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: palette.white30, marginTop: 2 },

  distBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: palette.emeraldDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderWidth: 1, borderColor: palette.emerald + '55',
  },
  distBadgeAlert: { backgroundColor: palette.crimsonDim, borderColor: palette.crimson + '55' },
  distTxt:        { fontFamily: fontFamily.monoMedium, fontSize: fontSize.xs, color: colors.success },
  distTxtAlert:   { color: colors.danger },

  zoneStrip: {
    backgroundColor: palette.emeraldDim,
    borderRadius: radius.lg,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderWidth: 1, borderColor: palette.emerald + '44',
    alignItems: 'center',
  },
  zoneStripAlert:  { backgroundColor: palette.crimsonDim, borderColor: palette.crimson + '44' },
  zoneTxt:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success },
  zoneTxtAlert:    { color: colors.danger },

  ctrlRow:         { flexDirection: 'row', gap: spacing[2] },
  ctrlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[1], paddingVertical: spacing[3], borderRadius: radius.lg,
    backgroundColor: palette.white05,
    borderWidth: 1, borderColor: palette.white10,
  },
  ctrlBtnPrimary:  { backgroundColor: palette.azure, borderColor: palette.azure, flex: 2 },
  ctrlBtnDisabled: { opacity: 0.35 },
  ctrlTxt:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.white60 },
  ctrlTxtPrimary:  { color: '#fff' },
});
