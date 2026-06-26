/**
 * LiveTrackingScreen â€” Real-time agent tracking (CLIENT app).
 *
 * Map engine: WebView + Leaflet (zero Google dependency, zero API key)
 * Real-time updates: injectJavaScript() â†’ Leaflet JS API
 *
 * FIX HISTORY:
 *  v2 â€” html memoized with useMemo (was rebuilt every render â†’ WebView remounted
 *        every second â†’ tracking reset on every GPS update) [CRITICAL]
 *     â€” Removed dead react-native-svg imports
 *     â€” WebView readiness confirmed via postMessage ('ready') not just onLoad
 *     â€” inject() guard: skip if webRef null or not ready
 *     â€” leaveMission now emits socket event to stop server-side forwarding
 *  v3 â€” [BUG FIX] alertBanner elevation raised from 14 â†’ 30.
 *        On Android, elevation determines z-order inside a stacking context.
 *        The bottom card had elevation:24, which placed it ABOVE the alertBanner
 *        (elevation:14), hiding the out-of-zone error popup completely on Android.
 *     â€” [BUG FIX] Hardcoded French strings replaced with t() calls.
 *     â€” [BUG FIX] useSocketTracking now returns lastSeenAt (ISO string).
 *     â€” useTranslation import fixed: '@i18n' instead of 'react-i18next'.
 *  v4 â€” [BUG FIX] Alert banner âœ• close button completely unresponsive.
 *
 *       ROOT CAUSES (all fixed):
 *
 *       1. pointerEvents race â€” Animated.View had pointerEvents={pendingAlert ?
 *          'auto' : 'none'}. The moment dismissAlert() was called, React set
 *          pendingAlert=null in the SAME synchronous frame, flipping pointerEvents
 *          to 'none' before the 220 ms slide-out animation had even started.
 *          Any tap on âœ• during that animation was silently swallowed.
 *          Fix: pointerEvents is now driven by a separate isVisible ref that
 *          is set to false only after the animation callback fires, not on
 *          state change.
 *
 *       2. Animation ownership conflict â€” useEffect watched pendingAlert to
 *          trigger both slide-in AND slide-out. When the socket fired a new
 *          alert during the slide-out, pendingAlert became non-null again,
 *          immediately calling spring() and fighting the running timing()
 *          animation. Leaflet's requestAnimationFrame loop on the WebView
 *          made this worse on lower-end Android devices.
 *          Fix: All animation calls are now owned exclusively by
 *          slideIn() / slideOut() helpers. The useEffect only calls slideIn.
 *          dismissAlert() calls slideOut directly.
 *
 *       3. Alert queue clobbering â€” rapid successive geofence alerts from the
 *          socket called setPendingAlert(newAlert) and overwrote the null that
 *          dismiss had just written, re-showing the banner mid-animation.
 *          Fix: useSocketTracking v4 now maintains an internal queue; the
 *          screen always sees at most one alert at a time and the next queued
 *          alert surfaces only after dismissAlert() is acknowledged.
 *
 *       4. Inline initials computation â€” duplicated 3Ã— in the component.
 *          Replaced with getInitials() from formatters.ts.
 *
 *       5. handleDismissAlert was defined after the useEffect that referenced
 *          it via eslint-disable suppression, masking a stale-closure risk.
 *          All callbacks are now defined before the effects that use them.
 *  v5 â€” [BUG FIX C3] Missing/invalid mission coordinates no longer mount a
 *        broken Leaflet map. siteLat/siteLng are validated; when absent, out of
 *        range, or (0,0), an explicit "location unavailable" state is rendered
 *        instead of setView([undefined, undefined]) / a false 0Â°N 0Â°E breach.
 *  v6 â€” [FIX H3] Rebuilt on the shared <LeafletMapView> shell: Leaflet's
 *        JS/CSS are inlined from the bundle (no unpkg CDN fetch at runtime),
 *        and this screen now gets real error/retry UI for the first time â€”
 *        previously a stalled Leaflet load just left mapLoading=true forever
 *        with no way out, on the single highest-stakes map in the app (the
 *        live breach-alert screen). The local WebView ref, jsReadyRef, and
 *        mapLoading state are gone; the shell owns readiness/loading/error,
 *        and onReady replays the current agent position into a freshly
 *        (re)initialised map, same as before but keyed off the shell's
 *        callback instead of a raw postMessage 'ready' check.
 *  v7 â€” [FIX H4] Two gaps closed:
 *        (1) Position freshness was previously a binary signalLost flag with
 *        a 30s cliff â€” the status bar showed "Last seen HH:mm" continuously,
 *        which reads as a clock, not a freshness signal. Now: fresh positions
 *        (<10s old) show the already-existing-but-unused t('status_live')
 *        string; positions between 10s and the 30s signal-lost cutoff show a
 *        live-ticking "Updated Ns ago" via the new updated_ago_s i18n key;
 *        signal-lost/offline/waiting states are unchanged. A 1s interval only
 *        runs while there's an active, non-lost position to age.
 *        (2) No ETA was shown anywhere on this screen (distance only). Added
 *        the same rolling-speed ETA estimate used in AgentApproachBanner â€”
 *        kept as a short ref-based fix history toward the site, displayed in
 *        the bottom card only while the agent is still approaching (!inZone);
 *        once on-site an ETA to "arrive" is meaningless, so it's hidden.
 */

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Vibration,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Navigation2, MapPin, Wifi, WifiOff,
  AlertTriangle, CheckCircle2, Target, RefreshCw,
  WifiOff as SignalIcon, MapPinOff, Clock,
} from 'lucide-react-native';
import { useTranslation }       from '@i18n';
import i18n                     from '@i18n';
import { ScreenHeader }         from '@components/ui';
import { LeafletMapView, type LeafletMapViewHandle } from '@components/ui/LeafletMapView';
import { colors, palette }      from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { getInitials } from '@utils/formatters';
import { config }               from '@config';
import { socketService }        from '@services/socketService';
import { useSocketTracking }    from '@hooks/useSocketTracking';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'LiveTracking'>;

const GEOFENCE_RADIUS_M  = 30;
/** Must be longer than the slide-out timing duration (220 ms) to prevent
 *  pointerEvents from flipping before the animation finishes. */
const ALERT_SLIDE_OUT_MS = 220;
const ALERT_SLIDE_IN_CONFIG = { friction: 8, tension: 80, useNativeDriver: true } as const;

// [FIX H4] Below this age a position counts as "live"; above it (but still
// short of useSocketTracking's 30s signalLost cutoff) we show a ticking
// "Updated Ns ago" instead, since a continuously-updating clock time reads
// as the current time, not as evidence of freshness.
const LIVE_THRESHOLD_S = 10;

// [FIX H4] ETA tuning â€” mirrors AgentApproachBanner's estimateEtaMinutes.
/** Below this approach speed the agent is treated as stationary â†’ no ETA. */
const MIN_APPROACH_MPS = 0.5;          // ~1.8 km/h
/** Cap the ETA we'll display; beyond this it's not useful. */
const MAX_ETA_MIN      = 180;
/** How many recent fixes to keep for the rolling speed estimate. */
const ETA_HISTORY      = 5;

interface FixSample { lat: number; lng: number; t: number; }

/**
 * Estimate ETA in whole minutes from a short history of fixes toward the site,
 * or null when it can't be reliably computed (too few fixes / stationary).
 * Identical approach to AgentApproachBanner.estimateEtaMinutes â€” kept as a
 * separate copy rather than a shared import because the two screens have
 * different fix-history lifetimes (this one resets when the map remounts via
 * coordsValid; the banner's spans the whole approach phase) and pulling it
 * into a shared util for two call sites isn't worth the indirection yet.
 */
function estimateEtaMinutes(
  history: FixSample[],
  siteLat: number,
  siteLng: number,
  fallbackMps?: number | null,
): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1];

  const haversineM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const remainingM = haversineM(latest.lat, latest.lng, siteLat, siteLng);

  let mps: number | null = null;
  if (history.length >= 2) {
    const first = history[0];
    const dStart = haversineM(first.lat, first.lng, siteLat, siteLng);
    const closedM = dStart - remainingM;
    const dtSec = (latest.t - first.t) / 1000;
    if (dtSec > 0 && closedM > 0) mps = closedM / dtSec;
  }
  if (mps === null && typeof fallbackMps === 'number' && isFinite(fallbackMps)) {
    mps = fallbackMps;
  }
  if (mps === null || mps < MIN_APPROACH_MPS) return null;

  const etaMin = Math.round(remainingM / mps / 60);
  if (etaMin <= 0) return 0;
  if (etaMin > MAX_ETA_MIN) return null;
  return etaMin;
}

const TRACKING_EXTRA_STYLE = `
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
`;

// â”€â”€ Leaflet body script (runs once Leaflet + the map instance are ready) â”€â”€â”€â”€â”€â”€
function buildTrackingBodyScript(siteLat: number, siteLng: number, tileUrl: string): string {
  return `
  var SITE_LAT = ${siteLat};
  var SITE_LNG = ${siteLng};
  var GEO_R   = ${GEOFENCE_RADIUS_M};

  L.tileLayer('${tileUrl}', {
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

  signalReady();
  `;
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function LiveTrackingScreen({ navigation, route }: Props) {
  const {
    missionId, bookingId, agentName,
    missionAddress, siteLat, siteLng,
  } = route.params;

  const { t } = useTranslation('tracking');

  // [FIX C3] Mission coordinates can be null/undefined at runtime (draft mission,
  // failed geocoding, or a push deep-link with absent siteLat/siteLng). Without
  // this guard, the body script interpolates `undefined` into Leaflet's
  // setView([undefined, undefined]) â€” a blank/broken map â€” or, via the
  // notification router's `parseFloat(... ?? '0')` default, silently centres on
  // 0Â°N 0Â°E and reports a permanent multi-thousand-km "out of zone" breach.
  // Hooks below must still run unconditionally (rules of hooks), so this only
  // gates the RENDER, not the hook calls.
  const coordsValid =
    typeof siteLat === 'number' && isFinite(siteLat) && Math.abs(siteLat) <= 90 &&
    typeof siteLng === 'number' && isFinite(siteLng) && Math.abs(siteLng) <= 180 &&
    !(siteLat === 0 && siteLng === 0);

  const mapRef        = useRef<LeafletMapViewHandle>(null);
  const followingRef  = useRef(true);

  const [showFollowBtn, setShowFollowBtn] = useState(false);

  const {
    agentPosition, lastSeenAt, connected, signalLost,
    distanceM, inZone, pendingAlert, dismissAlert,
  } = useSocketTracking({ missionId, bookingId, onMissionEnd: () => navigation.goBack() });

  // â”€â”€ [FIX H4] Position-age ticker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Only ticks while there's an active, non-lost position to age â€” no point
  // running a 1s interval while offline/waiting/signal-lost, where the
  // displayed text doesn't depend on the clock anyway.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!agentPosition || signalLost || !connected) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [agentPosition, signalLost, connected]);

  const positionAgeS = useMemo(() => {
    if (!lastSeenAt) return null;
    const ageMs = nowMs - new Date(lastSeenAt).getTime();
    return Math.max(0, Math.round(ageMs / 1000));
  }, [lastSeenAt, nowMs]);

  // â”€â”€ [FIX H4] ETA fix history â€” short rolling window toward the site â”€â”€â”€â”€â”€â”€â”€â”€
  const etaHistoryRef = useRef<FixSample[]>([]);
  const [etaMin, setEtaMin] = useState<number | null>(null);

  // â”€â”€ Alert banner animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const alertSlide     = useRef(new Animated.Value(-160)).current;
  /**
   * isAlertVisible â€” ref (not state) so it can be read synchronously inside
   * animation callbacks and set without triggering re-renders.
   * true  = banner is on screen (either sliding in, fully visible, or sliding out)
   * false = banner is completely off screen
   *
   * pointerEvents on the Animated.View is derived from this ref via the
   * [alertPointerEvents, setAlertPointerEvents] state pair below so React
   * can still update the prop â€” but we only flip it to 'none' inside the
   * slide-out completion callback, NOT on pendingAlert state change.
   */
  const isAlertVisible = useRef(false);
  const [alertPointerEvents, setAlertPointerEvents] = useState<'auto' | 'none'>('none');

  /**
   * slideIn â€” starts the spring animation and enables touches immediately.
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
   * slideOut â€” starts the timing animation. Only disables touches and calls
   * dismissAlert() AFTER the animation completes. This is the critical fix:
   * pointerEvents stays 'auto' for the full 220 ms of the animation so the
   * user can always tap âœ•.
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
   * handleDismissAlert â€” public handler wired to the âœ• button and the
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

  // â”€â”€ Map body script (memoized â€” must never change identity or WebView
  // remounts mid-session and tracking resets). Falls back to (0,0) only when
  // coords are invalid; in that case the map is never rendered (see the
  // coordsValid early-return below), so the bad centre is never shown to the
  // user â€” this keeps the useMemo call unconditional. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tileUrl = config.maps.tileUrlTemplate;
  const bodyScript = useMemo(
    () => buildTrackingBodyScript(coordsValid ? siteLat : 0, coordsValid ? siteLng : 0, tileUrl),
    [siteLat, siteLng, coordsValid, tileUrl],
  );

  // â”€â”€ WebView JS bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inject = useCallback((js: string) => {
    mapRef.current?.inject(js);
  }, []);

  // Push position updates into the map + [FIX H4] feed the ETA fix history.
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

    if (!coordsValid) return;
    const hist = etaHistoryRef.current;
    hist.push({
      lat: agentPosition.latitude,
      lng: agentPosition.longitude,
      t:   agentPosition.timestamp ?? Date.now(),
    });
    if (hist.length > ETA_HISTORY) hist.shift();
    setEtaMin(
      inZone ? null : estimateEtaMinutes(hist, siteLat, siteLng, agentPosition.speed),
    );
  }, [agentPosition, inZone, signalLost, inject, agentName, coordsValid, siteLat, siteLng]);

  // [FIX H3] The shell intercepts 'ready' itself for its own loading/error
  // chrome; this onMessage only needs to handle this screen's own 'pan' type.
  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'pan') {
        followingRef.current = false;
        setShowFollowBtn(true);
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // [FIX H3] Replay current state into a freshly-(re)initialised Leaflet
  // instance â€” fires on first load AND after a retry from the shell's error
  // state, covering the same "resume after reconnect" case the old raw
  // postMessage 'ready' handler covered.
  const handleMapReady = useCallback(() => {
    if (agentPosition) {
      const initials = getInitials(agentName);
      mapRef.current?.inject(
        `window.updateAgent(${agentPosition.latitude},${agentPosition.longitude},
          ${agentPosition.heading ?? 'null'},${inZone},'${initials}',
          ${agentPosition.accuracy ?? 0},${signalLost});
        window.flyToAgent(${agentPosition.latitude},${agentPosition.longitude});`
      );
    }
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

  // [FIX UI] Derived three-state zone status. Before the first position
  // (and distance) arrives the zone is genuinely UNKNOWN â€” the hook defaults
  // inZone=true, which previously made the bottom strip assert a green
  // "In zone (30 m)" while the status pill still said "Waiting for position"
  // and a stale "Out of zone" alert sat on top: three mutually contradictory
  // claims at once. We now treat no-position / no-distance as 'unknown' and
  // render a neutral waiting state instead of a false positive.
  const zoneState: 'unknown' | 'in' | 'out' = useMemo(() => {
    if (!agentPosition || distanceM === null) return 'unknown';
    return inZone ? 'in' : 'out';
  }, [agentPosition, distanceM, inZone]);

  // [FIX H4] ETA display string â€” only while still approaching (!inZone);
  // once on-site, "arriving in N min" no longer means anything.
  const etaLabel = useMemo(() => {
    if (inZone || etaMin === null) return null;
    if (etaMin <= 0) return t('eta_arriving');
    return t('eta_label', { minutes: etaMin });
  }, [inZone, etaMin, t]);

  // [FIX H4] statusText now distinguishes "fresh" (status_live, <10s old)
  // from "aging but still tracked" (a live-ticking "Updated Ns ago") instead
  // of showing a continuously-updating clock time for both cases alike.
  const statusText = useMemo(() => {
    if (!connected) return t('status_offline');
    if (signalLost) return t('status_signal_lost');
    if (agentPosition && positionAgeS !== null) {
      return positionAgeS < LIVE_THRESHOLD_S
        ? t('status_live')
        : t('updated_ago_s', { seconds: positionAgeS });
    }
    return t('status_waiting');
  }, [connected, signalLost, agentPosition, positionAgeS, t]);

  // â”€â”€ [FIX C3] Invalid coordinates â†’ explicit error state (no broken map) â”€â”€â”€â”€
  if (!coordsValid) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />
        <View style={styles.coordsErrorWrap}>
          <MapPinOff size={48} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.coordsErrorTitle}>{i18n.t('common:map_unavailable')}</Text>
          <Text style={styles.coordsErrorBody}>{i18n.t('common:check_connection')}</Text>
          {agentName ? (
            <Text style={styles.coordsErrorAgent}>{agentName}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.coordsErrorBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('common:back')}
          >
            <Text style={styles.coordsErrorBtnTxt}>{i18n.t('common:back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <View style={styles.container}>
      <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />

      {/* â”€â”€ Map â”€â”€ */}
      <LeafletMapView
        ref={mapRef}
        centerLat={siteLat}
        centerLng={siteLng}
        initialZoom={17}
        zoomControl
        dragging
        bodyScript={bodyScript}
        extraStyle={TRACKING_EXTRA_STYLE}
        onMessage={handleMessage}
        onReady={handleMapReady}
      />

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
       *  set to 'none' inside the slide-out animation callback â€” NOT on
       *  pendingAlert state change. This prevents the race where a tap on âœ•
       *  was swallowed because React had already flipped pointerEvents to
       *  'none' in the same render that started the animation.
       * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Animated.View
        style={[styles.alertBanner, { transform: [{ translateY: alertSlide }] }]}
        pointerEvents={alertPointerEvents}
      >
        <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
        <View style={styles.alertTextBlock}>
          <Text style={styles.alertTitle}>{pendingAlert ? t('out_of_zone') : ''}</Text>
          <Text style={styles.alertBody} numberOfLines={1}>
            {pendingAlert ? `${pendingAlert.agentName} â€” ${pendingAlert.distanceStr}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismissAlert}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          activeOpacity={0.6}
          style={styles.alertCloseBtn}
          accessibilityRole="button"
          accessibilityLabel={t('close_a11y')}
        >
          <Text style={styles.alertClose}>âœ•</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* â”€â”€ Re-center FAB â”€â”€ */}
      {showFollowBtn && (
        <TouchableOpacity style={styles.reCenterFab} onPress={handleFollowAgent} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('recenter_a11y')}>
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
          <View style={styles.badgeStack}>
            {etaLabel && (
              <View style={styles.etaBadge}>
                <Clock size={11} color={colors.info} strokeWidth={2} />
                <Text style={styles.etaTxt}>{etaLabel}</Text>
              </View>
            )}
            {zoneState !== 'unknown' && distanceLabel && (
              <View style={[styles.distBadge, zoneState === 'out' && styles.distBadgeAlert]}>
                {zoneState === 'in'
                  ? <CheckCircle2 size={12} color={colors.success} strokeWidth={2.5} />
                  : <AlertTriangle size={12} color={colors.danger}  strokeWidth={2.5} />
                }
                <Text style={[styles.distTxt, zoneState === 'out' && styles.distTxtAlert]}>
                  {distanceLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* [FIX UI] Zone strip is now three-state. While 'unknown' (no position
            yet) it shows a neutral waiting state instead of a false green
            "In zone" â€” which previously contradicted the "Waiting for position"
            pill and any stale out-of-zone alert. */}
        <View style={[
          styles.zoneStrip,
          zoneState === 'out'     && styles.zoneStripAlert,
          zoneState === 'unknown' && styles.zoneStripNeutral,
        ]}>
          <Text style={[
            styles.zoneTxt,
            zoneState === 'out'     && styles.zoneTxtAlert,
            zoneState === 'unknown' && styles.zoneTxtNeutral,
          ]}>
            {zoneState === 'unknown'
              ? t('zone_unknown')
              : zoneState === 'in'
                ? `âœ“ ${t('in_zone')} (${GEOFENCE_RADIUS_M} m)`
                : `âš  ${t('out_of_zone')}`}
          </Text>
        </View>

        <View style={styles.ctrlRow}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={handleViewSite} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={t('view_site_btn')}>
            <MapPin size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.ctrlTxt}>{t('view_site_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, styles.ctrlBtnPrimary, !agentPosition && styles.ctrlBtnDisabled]}
            onPress={handleFollowAgent}
            disabled={!agentPosition}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('follow_agent_btn')}
            accessibilityState={{ disabled: !agentPosition }}
          >
            <Navigation2 size={15} color="#fff" strokeWidth={2} />
            <Text style={[styles.ctrlTxt, styles.ctrlTxtPrimary]}>{t('follow_agent_btn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => socketService.resyncMission(missionId)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('sync_btn')}
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

  // [FIX C3] Coordinates-unavailable state.
  coordsErrorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing[3], paddingHorizontal: spacing[6],
  },
  coordsErrorTitle: {
    fontFamily: fontFamily.display, fontSize: fontSize.lg, color: palette.white,
    marginTop: spacing[2], textAlign: 'center',
  },
  coordsErrorBody: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted,
    textAlign: 'center',
  },
  coordsErrorAgent: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary,
    marginTop: spacing[1],
  },
  coordsErrorBtn: {
    marginTop: spacing[4],
    backgroundColor: palette.uiBlue, borderRadius: radius.full,
    paddingHorizontal: spacing[6], paddingVertical: spacing[3],
  },
  coordsErrorBtnTxt: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.white,
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
    // [FIX UI] Centered, auto-width chip instead of a full-width bar â€” the
    // old left:16/right:16 span ran straight under the map's top-left +/-
    // zoom control and collided with it. Centering clears the control and
    // reads as a floating status pill.
    position: 'absolute', top: 60, alignSelf: 'center', maxWidth: '88%',
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.overlay,
    borderRadius: radius.full,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
    borderWidth: 1, borderColor: palette.white10,
  },
  statusTxt:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: palette.white },
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

  // [FIX H4] Stacks the ETA badge above the distance badge when both are shown.
  badgeStack: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },

  etaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: palette.uiBlue + '22', borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderWidth: 1, borderColor: colors.info + '55',
  },
  etaTxt: { fontFamily: fontFamily.monoMedium, fontSize: fontSize.xs, color: colors.info },

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
  zoneStripNeutral: { backgroundColor: palette.white05, borderColor: palette.white10 },
  zoneTxtNeutral:   { color: colors.textMuted },

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
