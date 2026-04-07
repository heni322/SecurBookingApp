/**
 * LiveTrackingScreen — Suivi agent en temps réel.
 *
 * Carte : OpenStreetMap via react-native-maps UrlTile (gratuit, sans clé API).
 * Provider : PROVIDER_DEFAULT sur iOS (MapKit), PROVIDER_GOOGLE sur Android.
 *
 * Features :
 *  ─ Tuiles OSM vectorielles (Tile.openstreetmap.org)
 *  ─ Marqueur agent animé avec direction compass
 *  ─ Zone geofence (cercle 30m autour du site) avec animation pulse
 *  ─ Bannière d'alerte si agent hors zone
 *  ─ Distance temps réel agent ↔ site
 *  ─ Statut WebSocket (connecté / hors ligne)
 *  ─ Boutons recentrer sur agent / sur site
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Vibration,
} from 'react-native';
import MapView, {
  Marker, Circle, UrlTile, PROVIDER_GOOGLE,
} from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Navigation2, MapPin, Wifi, WifiOff, AlertTriangle,
  CheckCircle2, RefreshCw, Target,
} from 'lucide-react-native';
import { ScreenHeader }      from '@components/ui';
import { colors, palette }   from '@theme/colors';
import { spacing, radius }   from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { socketService }     from '@services/socketService';
import type { AgentPosition, GeofenceAlert, DistanceUpdate } from '@services/socketService';
import { useAuthStore }      from '@store/authStore';
import { formatTime }        from '@utils/formatters';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'LiveTracking'>;

// ── Constants ─────────────────────────────────────────────────────────────────
const GEOFENCE_RADIUS_M = 30;         // mirror backend constant
const DELTA             = 0.004;      // tighter zoom than before
const OSM_TILE_URL      = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION   = '© OpenStreetMap contributors';

export default function LiveTrackingScreen({ navigation, route }: Props) {
  const {
    missionId, bookingId, agentName,
    missionAddress, siteLat, siteLng,
  } = route.params;

  const mapRef = useRef<MapView>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [agentPos,   setAgentPos]   = useState<AgentPosition | null>(null);
  const [lastSeen,   setLastSeen]   = useState<string | null>(null);
  const [connected,  setConnected]  = useState(false);
  const [centered,   setCentered]   = useState(true);
  const [distanceM,  setDistanceM]  = useState<number | null>(null);
  const [inZone,     setInZone]     = useState(true);
  const [geofenceAlert, setGeofenceAlert] = useState<GeofenceAlert | null>(null);

  // ── Animations ────────────────────────────────────────────────────────────
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const alertAnim   = useRef(new Animated.Value(0)).current;
  const headingAnim = useRef(new Animated.Value(0)).current;

  // Geofence ring pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Alert slide-in
  const showAlert = useCallback((alert: GeofenceAlert) => {
    setGeofenceAlert(alert);
    Vibration.vibrate([0, 300, 100, 300]);
    Animated.spring(alertAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
  }, [alertAnim]);

  const dismissAlert = () => {
    Animated.timing(alertAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setGeofenceAlert(null);
    });
  };

  // ── WebSocket setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) socketService.connect(token);
    socketService.joinMission(missionId);
    setConnected(socketService.isConnected());

    // Agent GPS position
    const unsubPos = socketService.onAgentPosition((pos: AgentPosition) => {
      if (pos.missionId !== missionId) return;

      setAgentPos(pos);
      setLastSeen(formatTime(new Date(pos.timestamp).toISOString()));
      setConnected(true);

      // Animate compass heading
      if (pos.heading != null && pos.heading >= 0) {
        Animated.timing(headingAnim, {
          toValue:  pos.heading,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }

      // Follow agent camera
      if (centered) {
        mapRef.current?.animateCamera({
          center:  { latitude: pos.latitude, longitude: pos.longitude },
          zoom:    16,
          heading: pos.heading ?? 0,
        }, { duration: 600 });
      }
    });

    // Distance / geofence state from server
    const unsubDist = socketService.onDistanceUpdate((d: DistanceUpdate) => {
      if (d.missionId !== missionId) return;
      setDistanceM(d.distanceM);
      setInZone(d.inZone);
    });

    // Geofence breach alert
    const unsubAlert = socketService.onGeofenceAlert((a: GeofenceAlert) => {
      if (a.missionId !== missionId) return;
      showAlert(a);
    });

    // Mission end
    const unsubMission = socketService.onMissionUpdate((data: any) => {
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        navigation.goBack();
      }
    });

    return () => { unsubPos(); unsubDist(); unsubAlert(); unsubMission(); };
  }, [missionId, centered, showAlert, navigation, headingAnim]);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const centerOnAgent = useCallback(() => {
    setCentered(true);
    if (agentPos) {
      mapRef.current?.animateCamera({
        center: { latitude: agentPos.latitude, longitude: agentPos.longitude },
        zoom:   16,
      }, { duration: 500 });
    }
  }, [agentPos]);

  const centerOnSite = useCallback(() => {
    setCentered(false);
    mapRef.current?.animateCamera({
      center: { latitude: siteLat, longitude: siteLng },
      zoom:   17,
    }, { duration: 500 });
  }, [siteLat, siteLng]);

  // ── Distance label ────────────────────────────────────────────────────────
  const distanceLabel = distanceM !== null
    ? distanceM < 1000
      ? `${distanceM} m`
      : `${(distanceM / 1000).toFixed(1)} km`
    : null;

  const agentInitials = agentName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Suivi en direct" onBack={() => navigation.goBack()} />

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        // Use PROVIDER_GOOGLE on Android (required for smooth tile loading)
        // Use undefined (MapKit) on iOS — OSM tiles work on both
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialCamera={{
          center:   { latitude: siteLat, longitude: siteLng },
          zoom:     16,
          heading:  0,
          pitch:    0,
          altitude: 0,
        }}
        onPanDrag={() => setCentered(false)}
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
        rotateEnabled={true}
        pitchEnabled={false}
      >
        {/* ── OpenStreetMap tiles — free, no API key ── */}
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
          shouldReplaceMapContent={Platform.OS === 'ios'}
        />

        {/* ── Geofence circle (30m) with pulse ── */}
        <Circle
          center={{ latitude: siteLat, longitude: siteLng }}
          radius={GEOFENCE_RADIUS_M}
          fillColor={inZone ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}
          strokeColor={inZone ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'}
          strokeWidth={2}
          zIndex={1}
        />

        {/* ── Outer alert ring (only visible when out of zone) ── */}
        {!inZone && (
          <Circle
            center={{ latitude: siteLat, longitude: siteLng }}
            radius={GEOFENCE_RADIUS_M * 1.6}
            fillColor="rgba(239,68,68,0.04)"
            strokeColor="rgba(239,68,68,0.3)"
            strokeWidth={1}
            zIndex={1}
          />
        )}

        {/* ── Mission site marker ── */}
        <Marker
          coordinate={{ latitude: siteLat, longitude: siteLng }}
          title="Site de mission"
          description={missionAddress}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={2}
        >
          <View style={[styles.siteMarker, !inZone && styles.siteMarkerAlert]}>
            <MapPin size={18} color="#fff" strokeWidth={2.5} />
          </View>
        </Marker>

        {/* ── Agent marker with heading arrow ── */}
        {agentPos && (
          <Marker
            coordinate={{ latitude: agentPos.latitude, longitude: agentPos.longitude }}
            title={agentName}
            description={lastSeen ? `Vu à ${lastSeen}` : ''}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={3}
          >
            <View style={styles.agentMarkerWrap}>
              {/* Compass heading arrow */}
              {agentPos.heading != null && agentPos.heading >= 0 && (
                <View style={[
                  styles.headingArrow,
                  { transform: [{ rotate: `${agentPos.heading}deg` }] },
                ]}>
                  <Navigation2 size={12} color={colors.primary} strokeWidth={2.5} />
                </View>
              )}
              {/* Agent avatar bubble */}
              <View style={[styles.agentBubble, !inZone && styles.agentBubbleAlert]}>
                <Text style={styles.agentInitials}>{agentInitials}</Text>
              </View>
              {/* Online pulse dot */}
              <View style={styles.onlineDotWrap}>
                <View style={[styles.onlineDot, !inZone && styles.onlineDotAlert]} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── OSM Attribution (required by license) ── */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>{OSM_ATTRIBUTION}</Text>
      </View>

      {/* ── Status bar ── */}
      <View style={styles.statusBar}>
        {connected
          ? <Wifi     size={13} color={colors.success} strokeWidth={2} />
          : <WifiOff  size={13} color={colors.danger}  strokeWidth={2} />
        }
        <Text style={styles.statusText}>
          {connected
            ? (agentPos ? `Mis à jour ${lastSeen}` : 'En attente de position…')
            : 'Hors ligne — reconnexion…'
          }
        </Text>
        {!agentPos && connected && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
        )}
      </View>

      {/* ── Geofence alert banner ── */}
      {geofenceAlert && (
        <Animated.View style={[
          styles.alertBanner,
          {
            transform: [{
              translateY: alertAnim.interpolate({
                inputRange: [0, 1], outputRange: [-120, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.alertContent}>
            <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Agent hors zone</Text>
              <Text style={styles.alertBody}>
                {geofenceAlert.agentName} est à {geofenceAlert.distanceStr} du site.
              </Text>
            </View>
            <TouchableOpacity onPress={dismissAlert} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.alertDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Bottom info card ── */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {/* Agent info */}
          <View style={styles.agentAvatar}>
            <Text style={styles.agentAvatarText}>{agentInitials}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardAgentName}>{agentName}</Text>
            <Text style={styles.cardAddress} numberOfLines={1}>{missionAddress}</Text>
          </View>

          {/* Distance badge */}
          {distanceLabel && (
            <View style={[styles.distanceBadge, !inZone && styles.distanceBadgeAlert]}>
              {inZone
                ? <CheckCircle2 size={13} color={colors.success} strokeWidth={2} />
                : <AlertTriangle size={13} color={colors.danger} strokeWidth={2} />
              }
              <Text style={[styles.distanceText, !inZone && styles.distanceTextAlert]}>
                {distanceLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Zone status */}
        <View style={[styles.zoneStatus, !inZone && styles.zoneStatusAlert]}>
          <Text style={[styles.zoneStatusText, !inZone && styles.zoneStatusTextAlert]}>
            {inZone
              ? `✓ Agent dans la zone (${GEOFENCE_RADIUS_M}m)`
              : `⚠ Agent hors zone — alerte envoyée`
            }
          </Text>
        </View>

        {/* Control buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.mapBtn} onPress={centerOnSite} activeOpacity={0.75}>
            <MapPin size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.mapBtnTxt}>Site</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mapBtn, styles.mapBtnPrimary, !agentPos && styles.mapBtnDisabled]}
            onPress={centerOnAgent}
            disabled={!agentPos}
            activeOpacity={0.75}
          >
            <Target size={15} color="#fff" strokeWidth={2} />
            <Text style={[styles.mapBtnTxt, styles.mapBtnTxtPrimary]}>Suivre l'agent</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mapBtn} onPress={() => socketService.joinMission(missionId)} activeOpacity={0.75}>
            <RefreshCw size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.mapBtnTxt}>Sync</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C0F' },

  // Attribution
  attribution:     { position: 'absolute', bottom: 280, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  attributionText: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },

  // Status bar
  statusBar: {
    position: 'absolute', top: 100, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,12,15,0.85)',
    borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statusText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: '#fff', flex: 1 },

  // Alert banner
  alertBanner: {
    position: 'absolute', top: 150, left: 16, right: 16,
    backgroundColor: colors.danger, borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  alertContent:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  alertTitle:    { fontFamily: fontFamily.display, fontSize: fontSize.base, color: '#fff', letterSpacing: -0.2 },
  alertBody:     { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  alertDismiss:  { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: 'rgba(255,255,255,0.8)' },

  // Site marker
  siteMarker:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  siteMarkerAlert: { backgroundColor: colors.danger },

  // Agent marker
  agentMarkerWrap: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56 },
  headingArrow:    { position: 'absolute', top: 0, left: '50%', marginLeft: -6 },
  agentBubble:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  agentBubbleAlert:{ backgroundColor: '#7F1D1D', borderColor: colors.danger },
  agentInitials:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: '#fff' },
  onlineDotWrap:   { position: 'absolute', bottom: 2, right: 2 },
  onlineDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.emerald, borderWidth: 2, borderColor: '#fff' },
  onlineDotAlert:  { backgroundColor: colors.danger },

  // Bottom card
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,12,15,0.97)',
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing[4], gap: spacing[3],
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },
  cardRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  agentAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.azureDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  agentAvatarText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: '#fff' },
  cardInfo:      { flex: 1 },
  cardAgentName: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: '#fff', letterSpacing: -0.2 },
  cardAddress:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  distanceBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successSurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderWidth: 1, borderColor: colors.success + '60' },
  distanceBadgeAlert: { backgroundColor: colors.dangerSurface, borderColor: colors.danger + '60' },
  distanceText:       { fontFamily: fontFamily.monoMedium, fontSize: fontSize.xs, color: colors.success },
  distanceTextAlert:  { color: colors.danger },

  zoneStatus:          { backgroundColor: colors.successSurface, borderRadius: radius.lg, paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.success + '40' },
  zoneStatusAlert:     { backgroundColor: colors.dangerSurface, borderColor: colors.danger + '40' },
  zoneStatusText:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success, textAlign: 'center' },
  zoneStatusTextAlert: { color: colors.danger },

  btnRow:          { flexDirection: 'row', gap: spacing[2] },
  mapBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[3], borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mapBtnPrimary:   { backgroundColor: palette.azure, borderColor: palette.azure, flex: 2 },
  mapBtnDisabled:  { opacity: 0.35 },
  mapBtnTxt:       { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  mapBtnTxtPrimary:{ color: '#fff' },
});
