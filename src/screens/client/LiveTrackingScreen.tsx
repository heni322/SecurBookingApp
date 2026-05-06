/**
 * LiveTrackingScreen — Real-time agent tracking (CLIENT app).
 *
 * Map engine: WebView + Leaflet (zero Google dependency, zero API key)
 * Real-time updates: injectJavaScript() â†’ Leaflet JS API
 *
 * FIX HISTORY:
 *  v2 — html memoized with useMemo (was rebuilt every render â†’ WebView remounted
 *        every second â†’ tracking reset on every GPS update) [CRITICAL]
 *     — Removed dead react-native-svg imports
 *     — WebView readiness confirmed via postMessage ('ready') not just onLoad
 *     — inject() guard: skip if webRef null or not ready
 *     — leaveMission now emits socket event to stop server-side forwarding
 *  v3 — [BUG FIX] alertBanner elevation raised from 14 â†’ 30.
 *        On Android, elevation determines z-order inside a stacking context.
 *        The bottom card had elevation:24, which placed it ABOVE the alertBanner
 *        (elevation:14), hiding the out-of-zone error popup completely on Android.
 *     — [BUG FIX] Hardcoded French strings replaced with t() calls.
 *     — [BUG FIX] useSocketTracking now returns lastSeenAt (ISO string).
 *     — useTranslation import fixed: '@i18n' instead of 'react-i18next'.
 *  v4 — [BUG FIX] Alert banner ✕ close button completely unresponsive.
 *
 *       ROOT CAUSES (all fixed):
 *
 *       1. pointerEvents race — Animated.View had pointerEvents={pendingAlert ?
 *          'auto' : 'none'}. The moment dismissAlert() was called, React set
 *          pendingAlert=null in the SAME synchronous frame, flipping pointerEvents
 *          to 'none' before the 220 ms slide-out animation had even started.
 *          Any tap on ✕ during that animation was silently swallowed.
 *          Fix: pointerEvents is now driven by a separate isVisible ref that
 *          is set to false only after the animation callback fires, not on
 *          state change.
 *
 *       2. Animation ownership conflict — useEffect watched pendingAlert to
 *          trigger both slide-in AND slide-out. When the socket fired a new
 *          alert during the slide-out, pendingAlert became non-null again,
 *          immediately calling spring() and fighting the running timing()
 *          animation. Leaflet's requestAnimationFrame loop on the WebView
 *          made this worse on lower-end Android devices.
 *          Fix: All animation calls are now owned exclusively by
 *          slideIn() / slideOut() helpers. The useEffect only calls slideIn.
 *          dismissAlert() calls slideOut directly.
 *
 *       3. Alert queue clobbering — rapid successive geofence alerts from the
 *          socket called setPendingAlert(newAlert) and overwrote the null that
 *          dismiss had just written, re-showing the banner mid-animation.
 *          Fix: useSocketTracking v4 now maintains an internal queue; the
 *          screen always sees at most one alert at a time and the next queued
 *          alert surfaces only after dismissAlert() is acknowledged.
 *
 *       4. Inline initials computation — duplicated 3Ã— in the component.
 *          Replaced with getInitials() from formatters.ts.
 *
 *       5. handleDismissAlert was defined after the useEffect that referenced
 *          it via eslint-disable suppression, masking a stale-closure risk.
 *          All callbacks are now defined before the effects that use them.
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
import { useTranslation }       from '@i18n';
import { ScreenHeader }         from '@components/ui';
import { colors, palette }      from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatTime, getInitials } from '@utils/formatters';
import { socketService }        from '@services/socketService';
import { useSocketTracking }    from '@hooks/useSocketTracking';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'LiveTracking'>;

const GEOFENCE_RADIUS_M  = 30;
/** Must be longer than the slide-out timing duration (220 ms) to prevent
 *  pointerEvents from flipping before the animation finishes. */
const ALERT_SLIDE_OUT_MS = 220;
const ALERT_SLIDE_IN_CONFIG = { friction: 8, tension: 80, useNativeDriver: true } as const;

// â”€â”€ Leaflet HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    background:#0c1220 !important; color:#bc933b !important;
    border-color:#1e2d45 !important;
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

  var geoFill = L.circle([SITE_LAT, SITE_LNG], {
    radius: GEO_R, weight: 2, opacity: 0.85,
    color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.13,
    className: 'pulse-ring',
  }).addTo(map);

  var geoOuter = L.circle([SITE_LAT, SITE_LNG], {
    radius: GEO_R * 2, weight: 1, opacity: 0.25,
    color: '#4ade80', fillColor: 'transparent', fillOpacity: 0,
  }).addTo(map);

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

  var agentMarker    = null;
  var accuracyCircle = null;
  var arrowMarker    = null;

  window.updateAgent = function(lat, lng, heading, inZone, initials, accuracy, signalLost) {
    var bubbleColor = signalLost ? '#666' : (inZone ? '#3b82f6' : '#ef4444');
    var dotColor    = inZone ? '#4ade80' : '#f1c47d';
    var opacity     = signalLost ? 0.5 : 1;
    var showArrow   = heading !== null && heading >= 0 && !signalLost;

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
    var color = inZone ? '#4ade80' : '#ef4444';
    geoFill.setStyle({ color: color, fillColor: color });
    geoOuter.setStyle({ color: color });
  };

  map.on('dragstart', function() {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pan' }));
    }
  });

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  }
})();
</script>
</body>
</html>`;
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function LiveTrackingScreen({ navigation, route }: Props) {
  const {
    missionId, bookingId, agentName,
    missionAddress, siteLat, siteLng,
  } = route.params;

  const { t } = useTranslation('tracking');

  const webRef       = useRef<WebViewType>(null);
  const followingRef = useRef(true);
  const jsReadyRef   = useRef(false);

  const [showFollowBtn, setShowFollowBtn] = useState(false);
  const [mapLoading,    setMapLoading]    = useState(true);

  const {
    agentPosition, lastSeenAt, connected, signalLost,
    distanceM, inZone, pendingAlert, dismissAlert,
  } = useSocketTracking({ missionId, bookingId, onMissionEnd: () => navigation.goBack() });

  // â”€â”€ Alert banner animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const alertSlide     = useRef(new Animated.Value(-160)).current;
  /**
   * isAlertVisible — ref (not state) so it can be read synchronously inside
   * animation callbacks and set without triggering re-renders.
   * true  = banner is on screen (either sliding in, fully visible, or sliding out)
   * false = banner is completely off screen
   *
   * pointerEvents on the Animated.View is derived from this ref via the
   * [alertPointerEvents, setAlertPointerEvents] state pair below so React
   * can still update the prop — but we only flip it to 'none' inside the
   * slide-out completion callback, NOT on pendingAlert state change.
   */
  const isAlertVisible = useRef(false);
  const [alertPointerEvents, setAlertPointerEvents] = useState<'auto' | 'none'>('none');

  /**
   * slideIn — starts the spring animation and enables touches immediately.
   * Safe to call when already visible (spring will settle from current position).
   */
  const slideIn = useCallback(() => {
    setAlertPointerEvents('auto');
    isAlertVisible.current = true;
    Animated.spring(alertSlide, {
      toValue: 0,
      ...ALERT_SLIDE_IN_CONFIG,
    }).start();
  }, [alertSlide]);

  /**
   * slideOut — starts the timing animation. Only disables touches and calls
   * dismissAlert() AFTER the animation completes. This is the critical fix:
   * pointerEvents stays 'auto' for the full 220 ms of the animation so the
   * user can always tap ✕.
   */
  const slideOut = useCallback(() => {
    Animated.timing(alertSlide, {
      toValue: -160,
      duration: ALERT_SLIDE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Guard against unmounted component or interrupted animation
      if (!finished) return;
      isAlertVisible.current = false;
      setAlertPointerEvents('none');
      // Notify the hook AFTER animation so the next queued alert can surface.
      // If we called dismissAlert() before this, pendingAlert would change
      // mid-animation and potentially trigger slideIn() while slideOut() runs.
      dismissAlert();
    });
  }, [alertSlide, dismissAlert]);

  /**
   * handleDismissAlert — public handler wired to the ✕ button and the
   * auto-dismiss effect. Guards against double-tap: if the banner is already
   * sliding out (isAlertVisible = false) subsequent calls are ignored.
   */
  const handleDismissAlert = useCallback(() => {
    if (!isAlertVisible.current) return;
    Vibration.cancel();
    slideOut();
  }, [slideOut]);

  // Slide IN when a new alert arrives. The hook queues alerts so this fires
  // once per alert, never while a slide-out is in progress.
  useEffect(() => {
    if (pendingAlert) {
      Vibration.vibrate([0, 250, 100, 250]);
      slideIn();
    }
  }, [pendingAlert, slideIn]);

  // Auto-dismiss when agent returns to the geofence zone
  useEffect(() => {
    if (inZone && isAlertVisible.current) {
      handleDismissAlert();
    }
  }, [inZone, handleDismissAlert]);

  // â”€â”€ Map HTML (memoized — must never change identity or WebView remounts) â”€â”€
  const html = useMemo(
    () => buildTrackingHTML(siteLat, siteLng),
    [siteLat, siteLng],
  );

  // â”€â”€ WebView JS bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inject = useCallback((js: string) => {
    if (!webRef.current || !jsReadyRef.current) return;
    webRef.current.injectJavaScript(`(function(){${js}})(); true;`);
  }, []);

  // Push position updates into the map
  useEffect(() => {
    if (!agentPosition) return;
    const initials = getInitials(agentName);
    inject(
      `window.updateAgent(
        ${agentPosition.latitude},${agentPosition.longitude},
        ${agentPosition.heading ?? 'null'},${inZone},
        '${initials}',${agentPosition.accuracy ?? 0},${signalLost}
      );`
    );
    inject(`window.updateGeofence(${inZone});`);
    if (followingRef.current) {
      inject(`window.flyToAgent(${agentPosition.latitude}, ${agentPosition.longitude});`);
    }
  }, [agentPosition, inZone, signalLost, inject, agentName]);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        jsReadyRef.current = true;
        setMapLoading(false);
        // Replay current state into freshly-initialised Leaflet instance
        if (agentPosition) {
          const initials = getInitials(agentName);
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
  }, [agentPosition, agentName, inZone, signalLost]);

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

  // â”€â”€ Derived display values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const agentInitials = useMemo(() => getInitials(agentName), [agentName]);

  const distanceLabel = useMemo(() => {
    if (distanceM === null) return null;
    return distanceM < 1000 ? `${distanceM} m` : `${(distanceM / 1000).toFixed(1)} km`;
  }, [distanceM]);

  const statusText = useMemo(() => {
    if (!connected)                    return t('status_offline');
    if (signalLost)                    return t('status_signal_lost');
    if (agentPosition && lastSeenAt)   return t('last_seen', { time: formatTime(lastSeenAt) });
    return t('status_waiting');
  }, [connected, signalLost, agentPosition, lastSeenAt, t]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <View style={styles.container}>
      <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />

      {/* â”€â”€ Map â”€â”€ */}
      <View style={StyleSheet.absoluteFill}>
        {mapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.mapLoadingText}>{t('map_loading')}</Text>
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

      {/* â”€â”€ OSM Attribution â”€â”€ */}
      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionTxt}>{t('attribution')}</Text>
      </View>

      {/* â”€â”€ Status bar â”€â”€ */}
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

      {/* â”€â”€ Geofence alert banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
       *  pointerEvents is driven by alertPointerEvents state, which is only
       *  set to 'none' inside the slide-out animation callback — NOT on
       *  pendingAlert state change. This prevents the race where a tap on ✕
       *  was swallowed because React had already flipped pointerEvents to
       *  'none' in the same render that started the animation.
       * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Animated.View
        style={[styles.alertBanner, { transform: [{ translateY: alertSlide }] }]}
        pointerEvents={alertPointerEvents}
      >
        <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
        <View style={styles.alertTextBlock}>
          <Text style={styles.alertTitle}>{t('out_of_zone')}</Text>
          <Text style={styles.alertBody} numberOfLines={1}>
            {pendingAlert ? `${pendingAlert.agentName} — ${pendingAlert.distanceStr}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismissAlert}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          activeOpacity={0.6}
          style={styles.alertCloseBtn}
        >
          <Text style={styles.alertClose}>✕</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* â”€â”€ Re-center FAB â”€â”€ */}
      {showFollowBtn && (
        <TouchableOpacity style={styles.reCenterFab} onPress={handleFollowAgent} activeOpacity={0.8}>
          <Target size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* â”€â”€ Bottom card â”€â”€ */}
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

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.navy },
  webview:   { flex: 1, backgroundColor: palette.bg },

  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    gap: spacing[3], backgroundColor: palette.bg, zIndex: 10,
  },
  mapLoadingText: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted,
  },

  attribution: {
    position: 'absolute', bottom: 290, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  attributionTxt: {
    fontSize: 9, color: colors.textMuted, fontFamily: fontFamily.body,
  },

  statusBar: {
    position: 'absolute', top: 68, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.overlay,
    borderRadius: radius.full,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderWidth: 1, borderColor: palette.white10,
  },
  statusTxt:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.white, flex: 1 },
  statusTxtOff: { color: colors.danger },

  alertBanner: {
    position: 'absolute', top: 180, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.dangerSurface, borderRadius: radius.xl,
    padding: spacing[4],
    zIndex: 50,
    ...Platform.select({
      ios: {
        shadowColor: colors.danger, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55, shadowRadius: 14,
      },
      android: {
        // Must be higher than card (elevation: 24) to render on top.
        elevation: 30,
      },
    }),
  },
  alertTextBlock: { flex: 1 },
  alertTitle: {
    fontFamily: fontFamily.display, fontSize: fontSize.base,
    color: colors.white, letterSpacing: -0.2,
  },
  alertBody: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.textSecondary, marginTop: 2,
  },
  // Explicit container for the close button so the hitSlop has a defined
  // boundary to expand from and doesn't bleed outside the banner on Android.
  alertCloseBtn: {
    padding: spacing[1],
  },
  alertClose: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base,
    color: colors.textSecondary,
  },

  reCenterFab: {
    position: 'absolute', right: 16, bottom: 300,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: palette.panelSolid,
    borderWidth: 1, borderColor: palette.white10,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },

  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(12,18,32,0.97)',
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
    backgroundColor: 'rgba(96,165,250,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: palette.white },
  cardMeta:    { flex: 1 },
  cardName:    { fontFamily: fontFamily.display, fontSize: fontSize.base, color: palette.white, letterSpacing: -0.2 },
  cardAddress: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: palette.white30, marginTop: 2 },

  distBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: palette.uiGreen, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderWidth: 1, borderColor: `${palette.txtGreen}55`,
  },
  distBadgeAlert: { backgroundColor: palette.uiRed, borderColor: `${palette.txtRed}55` },
  distTxt:        { fontFamily: fontFamily.monoMedium, fontSize: fontSize.xs, color: colors.success },
  distTxtAlert:   { color: colors.danger },

  zoneStrip: {
    backgroundColor: palette.uiGreen, borderRadius: radius.lg,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderWidth: 1, borderColor: `${palette.txtGreen}44`, alignItems: 'center',
  },
  zoneStripAlert:  { backgroundColor: palette.uiRed, borderColor: `${palette.txtRed}44` },
  zoneTxt:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success },
  zoneTxtAlert:    { color: colors.danger },

  ctrlRow: { flexDirection: 'row', gap: spacing[2] },
  ctrlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[1], paddingVertical: spacing[3], borderRadius: radius.lg,
    backgroundColor: palette.white05, borderWidth: 1, borderColor: palette.white10,
  },
  ctrlBtnPrimary:  { backgroundColor: palette.uiBlue, borderColor: palette.uiBlue, flex: 2 },
  ctrlBtnDisabled: { opacity: 0.35 },
  ctrlTxt:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.white60 },
  ctrlTxtPrimary:  { color: colors.white },
});
