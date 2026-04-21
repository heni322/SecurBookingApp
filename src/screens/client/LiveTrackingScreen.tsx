/**
 * LiveTrackingScreen — Real-time agent tracking (CLIENT app).
 *
 * Map engine: WebView + Leaflet (zero Google dependency, zero API key)
 * Real-time updates: injectJavaScript() → Leaflet JS API
 *
 * FIX HISTORY:
 *  v2 — html memoized with useMemo (was rebuilt every render → WebView remounted
 *        every second → tracking reset on every GPS update) [CRITICAL]
 *     — Removed dead react-native-svg imports (Svg/G/SvgCircle/Path)
 *     — WebView readiness confirmed via postMessage ('ready') not just onLoad
 *     — inject() guard: skip if webRef null or not ready
 *     — leaveMission now emits socket event to stop server-side forwarding
 */

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Vibration,
} from 'react-native';
import { WebView }               from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
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

// ── Leaflet HTML ──────────────────────────────────────────────────────────────
// Built ONCE per screen mount (memoized). Rebuilding causes WebView remount
// which resets all Leaflet state — losing the agent marker on every GPS update.
function buildTrackingHTML(siteLat: number, siteLng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#0a0c0f; }
  .leaflet-control-attribution { display:none !important; }
  .leaflet-control-zoom a {
    background:#0d1f33 !important; color:#bc933b !important;
    border-color:#1a3d5e !important;
  }
  .agent-bubble {
    position:absolute; top:50%; left:50%;
    transform:translate(-50%,-50%);
    width:32px; height:32px; border-radius:50%;
    border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 3px 10px rgba(0,0,0,0.5);
    transition: background 0.3s ease;
  }
  .agent-bubble span { font-size:11px; font-weight:700; color:#fff; font-family:sans-serif; }
  .agent-dot {
    position:absolute; top:4px; right:4px;
    width:10px; height:10px; border-radius:50%; border:2px solid #fff;
  }
  @keyframes pulse {
    0%,100% { transform:scale(1);   opacity:0.8; }
    50%      { transform:scale(1.3); opacity:0.4; }
  }
  .pulse-ring { animation: pulse 2s ease-in-out infinite; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function() {
  var SITE_LAT = ${siteLat};
  var SITE_LNG = ${siteLng};
  var GEO_R   = ${GEOFENCE_RADIUS_M};

  var map = L.map('map', { zoomControl: true })
    .setView([SITE_LAT, SITE_LNG], 17);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: ''
  }).addTo(map);

  // ── Geofence ────────────────────────────────────────────────────────────
  var geoFill = L.circle([SITE_LAT, SITE_LNG], {
    radius: GEO_R, weight: 2, opacity: 0.85,
    color: '#10b981', fillColor: '#10b981', fillOpacity: 0.13,
    className: 'pulse-ring',
  }).addTo(map);

  var geoOuter = L.circle([SITE_LAT, SITE_LNG], {
    radius: GEO_R * 2, weight: 1, opacity: 0.25,
    color: '#10b981', fillColor: 'transparent', fillOpacity: 0,
  }).addTo(map);

  // ── Site marker ─────────────────────────────────────────────────────────
  var siteIcon = L.divIcon({
    className: '',
    html: '<div style="width:42px;height:42px;border-radius:50%;background:#bc933b;border:3px solid #fff;'
        + 'display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.5);">'
        + '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#fff\\' stroke-width=\\'2.5\\'>'
        + '<path d=\\'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\\'></path>'
        + '<circle cx=\\'12\\' cy=\\'10\\' r=\\'3\\'></circle>'
        + '</svg></div>',
    iconSize: [42, 42], iconAnchor: [21, 21],
  });
  L.marker([SITE_LAT, SITE_LNG], { icon: siteIcon }).addTo(map);

  // ── Agent state ─────────────────────────────────────────────────────────
  var agentMarker    = null;
  var accuracyCircle = null;
  var arrowMarker    = null;

  window.updateAgent = function(lat, lng, heading, inZone, initials, accuracy, signalLost) {
    var bubbleColor = signalLost ? '#666' : (inZone ? '#3b82f6' : '#ef4444');
    var dotColor    = inZone ? '#10b981' : '#f59e0b';
    var opacity     = signalLost ? 0.5 : 1;
    var showArrow   = heading !== null && heading >= 0 && !signalLost;

    // Arrow marker (separate layer so it rotates without affecting anchor)
    if (showArrow) {
      var arrowHtml = '<div style="width:56px;height:56px;opacity:' + opacity + ';pointer-events:none">'
        + '<svg viewBox=\\'0 0 56 56\\' xmlns=\\'http://www.w3.org/2000/svg\\' style=\\'transform:rotate('+heading+'deg);width:56px;height:56px;\\'>'
        + '<path d=\\'M28 8 L23 26 L28 20 L33 26 Z\\' fill=\\'' + bubbleColor + '\\' opacity=\\'0.7\\'/>'
        + '</svg></div>';
      var arrowIcon = L.divIcon({ className:'', html:arrowHtml, iconSize:[56,56], iconAnchor:[28,28] });
      if (!arrowMarker) {
        arrowMarker = L.marker([lat, lng], { icon: arrowIcon, zIndexOffset: 3 }).addTo(map);
      } else {
        arrowMarker.setLatLng([lat, lng]);
        arrowMarker.setIcon(arrowIcon);
      }
    } else if (arrowMarker) {
      map.removeLayer(arrowMarker);
      arrowMarker = null;
    }

    // Main bubble marker
    var bubbleHtml = '<div style="position:relative;width:56px;height:56px;opacity:' + opacity + '">'
      + '<div class=\\'agent-bubble\\' style=\\'background:' + bubbleColor + '\\'>'
      + '<span>' + initials + '</span></div>'
      + (!signalLost ? '<div class=\\'agent-dot\\' style=\\'background:' + dotColor + '\\'></div>' : '')
      + '</div>';

    var bubbleIcon = L.divIcon({ className:'', html:bubbleHtml, iconSize:[56,56], iconAnchor:[28,28] });

    if (!agentMarker) {
      agentMarker = L.marker([lat, lng], { icon: bubbleIcon, zIndexOffset: 4 }).addTo(map);
    } else {
      agentMarker.setLatLng([lat, lng]);
      agentMarker.setIcon(bubbleIcon);
    }

    // Accuracy circle
    var acc = Math.min(accuracy || 0, 150);
    if (acc > 0) {
      if (!accuracyCircle) {
        accuracyCircle = L.circle([lat, lng], {
          radius: acc, weight: 1, opacity: 0.35,
          color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08,
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng([lat, lng]);
        accuracyCircle.setRadius(acc);
      }
    }
  };

  window.flyToAgent = function(lat, lng) {
    map.flyTo([lat, lng], 17, { animate: true, duration: 0.7 });
  };

  window.flyToSite = function() {
    map.flyTo([SITE_LAT, SITE_LNG], 17, { animate: true, duration: 0.5 });
  };

  window.updateGeofence = function(inZone) {
    var color = inZone ? '#10b981' : '#ef4444';
    geoFill.setStyle({ color: color, fillColor: color });
    geoOuter.setStyle({ color: color });
  };

  // Notify RN when user pans (to stop camera follow)
  map.on('dragstart', function() {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pan' }));
    }
  });

  // Signal readiness AFTER all globals are defined
  // This fires after the IIFE completes — guarantees window.updateAgent exists
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  }
})();
</script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveTrackingScreen({ navigation, route }: Props) {
  const {
    missionId, bookingId, agentName,
    missionAddress, siteLat, siteLng,
  } = route.params;

  const { t } = useTranslation('tracking');

  const webRef       = useRef<WebViewType>(null);
  const followingRef = useRef(true);
  const jsReadyRef   = useRef(false); // true once Leaflet JS signals 'ready'

  const [showFollowBtn, setShowFollowBtn] = useState(false);
  const [mapLoading,    setMapLoading]    = useState(true);

  const {
    agentPosition, lastSeenLabel, connected, signalLost,
    distanceM, inZone, pendingAlert, dismissAlert,
  } = useSocketTracking({ missionId, bookingId, onMissionEnd: () => navigation.goBack() });

  // ── Animations ─────────────────────────────────────────────────────────────
  const alertSlide = useRef(new Animated.Value(-160)).current;

  useEffect(() => {
    if (pendingAlert) {
      Vibration.vibrate([0, 250, 100, 250]);
      Animated.spring(alertSlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }).start();
    } else {
      Animated.timing(alertSlide, { toValue: -160, duration: 220, useNativeDriver: true }).start();
    }
  }, [pendingAlert, alertSlide]);

  useEffect(() => {
    if (inZone && pendingAlert) dismissAlert();
  }, [inZone, pendingAlert, dismissAlert]);

  // ── CRITICAL FIX: memoize html so WebView never remounts on state changes ──
  // Without useMemo, buildTrackingHTML() runs every render (every GPS update)
  // → html prop changes → WebView unmounts+remounts → Leaflet state wiped
  const html = useMemo(
    () => buildTrackingHTML(siteLat, siteLng),
    [siteLat, siteLng],
  );

  // ── Safe inject helper ─────────────────────────────────────────────────────
  // Guards: webRef must exist AND Leaflet JS must have signaled 'ready'
  const inject = useCallback((js: string) => {
    if (!webRef.current || !jsReadyRef.current) return;
    webRef.current.injectJavaScript(`(function(){${js}})(); true;`);
  }, []);

  // ── Push agent updates into Leaflet ───────────────────────────────────────
  useEffect(() => {
    if (!agentPosition) return;

    const initials = agentName
      .split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

    inject(
      `window.updateAgent(
        ${agentPosition.latitude},
        ${agentPosition.longitude},
        ${agentPosition.heading ?? 'null'},
        ${inZone},
        '${initials}',
        ${agentPosition.accuracy ?? 0},
        ${signalLost}
      );`
    );

    inject(`window.updateGeofence(${inZone});`);

    if (followingRef.current) {
      inject(`window.flyToAgent(${agentPosition.latitude}, ${agentPosition.longitude});`);
    }
  }, [agentPosition, inZone, signalLost, inject, agentName]);

  // ── WebView → RN messages ──────────────────────────────────────────────────
  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        // Leaflet JS fully initialized — safe to inject now
        jsReadyRef.current = true;
        setMapLoading(false);
        // If we already have a position, push it immediately
        if (agentPosition) {
          const initials = agentName
            .split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
          webRef.current?.injectJavaScript(
            `(function(){
              window.updateAgent(${agentPosition.latitude},${agentPosition.longitude},
                ${agentPosition.heading ?? 'null'},${inZone},'${initials}',
                ${agentPosition.accuracy ?? 0},${signalLost});
              window.flyToAgent(${agentPosition.latitude},${agentPosition.longitude});
            })(); true;`
          );
        }
      } else if (msg.type === 'pan') {
        followingRef.current = false;
        setShowFollowBtn(true);
      }
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentPosition, agentName, inZone, signalLost]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleFollowAgent = useCallback(() => {
    followingRef.current = true;
    setShowFollowBtn(false);
    if (agentPosition) {
      inject(`window.flyToAgent(${agentPosition.latitude}, ${agentPosition.longitude});`);
    }
  }, [agentPosition, inject]);

  const handleViewSite = useCallback(() => {
    followingRef.current = false;
    setShowFollowBtn(true);
    inject('window.flyToSite();');
  }, [inject]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const agentInitials = agentName
    .split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  const distanceLabel = distanceM !== null
    ? distanceM < 1000 ? `${distanceM} m` : `${(distanceM / 1000).toFixed(1)} km`
    : null;

  const statusText = !connected
    ? t('status_offline')
    : signalLost ? '⚠ Signal GPS perdu'
    : agentPosition ? (lastSeenLabel ?? t('status_live'))
    : t('status_waiting');

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />

      {/* ── Map (full screen behind all overlays) ── */}
      <View style={StyleSheet.absoluteFill}>
        {mapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.mapLoadingText}>Chargement de la carte…</Text>
          </View>
        )}
        <WebView
          ref={webRef}
          source={{ html }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          originWhitelist={['*']}
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs
          allowFileAccess
          onError={() => setMapLoading(false)}
        />
      </View>

      {/* ── OSM Attribution ── */}
      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionTxt}>© OpenStreetMap contributors</Text>
      </View>

      {/* ── Status bar ── */}
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

      {/* ── Geofence alert banner ── */}
      <Animated.View
        style={[styles.alertBanner, { transform: [{ translateY: alertSlide }] }]}
        pointerEvents={pendingAlert ? 'auto' : 'none'}
      >
        <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>{t('out_of_zone')}</Text>
          <Text style={styles.alertBody} numberOfLines={1}>
            {pendingAlert ? `${pendingAlert.agentName} — ${pendingAlert.distanceStr}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismissAlert}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.alertClose}>✕</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Re-center FAB ── */}
      {showFollowBtn && (
        <TouchableOpacity style={styles.reCenterFab} onPress={handleFollowAgent} activeOpacity={0.8}>
          <Target size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* ── Bottom card ── */}
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
                : <AlertTriangle size={12} color={colors.danger}  strokeWidth={2.5} />
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
          <TouchableOpacity style={styles.ctrlBtn} onPress={handleViewSite} activeOpacity={0.75}>
            <MapPin size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.ctrlTxt}>{t('view_site_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, styles.ctrlBtnPrimary, !agentPosition && styles.ctrlBtnDisabled]}
            onPress={handleFollowAgent}
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
  webview:   { flex: 1, backgroundColor: '#0a0c0f' },

  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    gap: spacing[3], backgroundColor: '#0a0c0f', zIndex: 10,
  },
  mapLoadingText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },

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
    backgroundColor: colors.danger, borderRadius: radius.xl,
    padding: spacing[4], zIndex: 50,
    ...Platform.select({
      ios:     { shadowColor: colors.danger, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 14 },
      android: { elevation: 14 },
    }),
  },
  alertTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: '#fff', letterSpacing: -0.2 },
  alertBody:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  alertClose: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: 'rgba(255,255,255,0.75)' },

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
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    padding: spacing[5], gap: spacing[3],
    borderTopWidth: 1, borderTopColor: palette.white10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.35, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },

  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatarBubble: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: palette.azureDim,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: '#fff' },
  cardMeta:    { flex: 1 },
  cardName:    { fontFamily: fontFamily.display, fontSize: fontSize.base, color: palette.white, letterSpacing: -0.2 },
  cardAddress: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: palette.white30, marginTop: 2 },

  distBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: palette.emeraldDim, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderWidth: 1, borderColor: `${palette.emerald}55`,
  },
  distBadgeAlert: { backgroundColor: palette.crimsonDim, borderColor: `${palette.crimson}55` },
  distTxt:        { fontFamily: fontFamily.monoMedium, fontSize: fontSize.xs, color: colors.success },
  distTxtAlert:   { color: colors.danger },

  zoneStrip: {
    backgroundColor: palette.emeraldDim, borderRadius: radius.lg,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderWidth: 1, borderColor: `${palette.emerald}44`, alignItems: 'center',
  },
  zoneStripAlert:  { backgroundColor: palette.crimsonDim, borderColor: `${palette.crimson}44` },
  zoneTxt:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success },
  zoneTxtAlert:    { color: colors.danger },

  ctrlRow: { flexDirection: 'row', gap: spacing[2] },
  ctrlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[1], paddingVertical: spacing[3], borderRadius: radius.lg,
    backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10,
  },
  ctrlBtnPrimary:  { backgroundColor: palette.azure, borderColor: palette.azure, flex: 2 },
  ctrlBtnDisabled: { opacity: 0.35 },
  ctrlTxt:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.white60 },
  ctrlTxtPrimary:  { color: '#fff' },
});
