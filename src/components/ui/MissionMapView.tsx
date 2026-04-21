/**
 * MissionMapView — Leaflet/OSM read-only (or interactive) map.
 *
 * Why WebView instead of react-native-maps?
 *  react-native-maps on Android always uses Google Maps SDK as the native canvas
 *  renderer, even with mapType="none" — requires an API key and shows Google UI.
 *  WebView + Leaflet = 100% OSM, zero Google dependency, zero API key.
 *
 * FIX HISTORY:
 *  v2 — Added onError handler + offline fallback UI
 *     — Added onHttpError handler
 *     — html memoized with useMemo (was rebuilding on every render)
 *     — Leaflet CSS + JS loaded from unpkg CDN (HTTPS — no cleartext needed)
 */
import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Animated, TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin, RefreshCw, WifiOff } from 'lucide-react-native';
import { colors }  from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  latitude:     number;
  longitude:    number;
  radiusKm?:    number;
  title?:       string;
  height?:      number;
  interactive?: boolean;
}

function buildHTML(
  lat: number,
  lng: number,
  radiusM: number,
  title: string,
  interactive: boolean,
): string {
  const zoom = radiusM > 5000 ? 11 : radiusM > 2000 ? 12 : radiusM > 500 ? 13 : 14;
  const escapedTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#0d1f33; }
  .leaflet-control-attribution { display:none !important; }
  .leaflet-control-zoom { display:${interactive ? 'block' : 'none'} !important; }
  .leaflet-control-zoom a {
    background:#0d1f33 !important; color:#bc933b !important;
    border-color:#1a3d5e !important;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function() {
  var map = L.map('map', {
    zoomControl:     ${interactive},
    dragging:        ${interactive},
    touchZoom:       ${interactive},
    doubleClickZoom: ${interactive},
    scrollWheelZoom: ${interactive},
    boxZoom:         ${interactive},
    keyboard:        ${interactive},
    tap:             ${interactive},
  }).setView([${lat}, ${lng}], ${zoom});

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: ''
  }).addTo(map);

  ${radiusM > 0 ? `
  L.circle([${lat}, ${lng}], {
    radius: ${radiusM * 1.06}, color:'#bc933b',
    weight:1, opacity:0.3, fillOpacity:0,
  }).addTo(map);
  L.circle([${lat}, ${lng}], {
    radius: ${radiusM}, color:'#bc933b',
    weight:2, opacity:0.9, fillColor:'#bc933b', fillOpacity:0.12,
  }).addTo(map);
  ` : ''}

  var icon = L.divIcon({
    className:'',
    html:'<div style="width:36px;height:36px;background:#bc933b;border-radius:50%;border:3px solid #fff;'
       + 'display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.5);">'
       + '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#fff\\' stroke-width=\\'2.2\\'>'
       + '<path d=\\'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\\'></path>'
       + '<circle cx=\\'12\\' cy=\\'10\\' r=\\'3\\'></circle>'
       + '</svg></div>',
    iconSize:[36,36], iconAnchor:[18,36],
  });
  var marker = L.marker([${lat}, ${lng}], { icon:icon }).addTo(map);
  ${escapedTitle ? `marker.bindPopup('<b>${escapedTitle}</b>', { closeButton:false });` : ''}

  // Signal readiness to RN
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'ready' }));
  }
})();
</script>
</body>
</html>`;
}

export const MissionMapView: React.FC<Props> = ({
  latitude,
  longitude,
  radiusKm    = 0,
  title       = '',
  height      = 220,
  interactive = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [key,    setKey]    = useState(0); // increment to remount WebView on retry

  // CRITICAL: memoize html — rebuilding causes WebView remount on every render
  const html = useMemo(
    () => buildHTML(latitude, longitude, radiusKm * 1000, title, interactive),
    [latitude, longitude, radiusKm, title, interactive],
  );

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setStatus('ready');
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }
    } catch { /* ignore */ }
  }, [fadeAnim]);

  const handleError = useCallback(() => setStatus('error'), []);
  const handleRetry = useCallback(() => {
    setStatus('loading');
    fadeAnim.setValue(0);
    setKey(k => k + 1);
  }, [fadeAnim]);

  return (
    <View style={[styles.container, { height }]}>

      {/* Loading skeleton */}
      {status === 'loading' && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.overlayText}>Chargement de la carte…</Text>
        </View>
      )}

      {/* Error / offline fallback */}
      {status === 'error' && (
        <View style={styles.overlay}>
          <WifiOff size={28} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.errorTitle}>Carte indisponible</Text>
          <Text style={styles.errorSub}>Vérifiez votre connexion internet</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
            <RefreshCw size={13} color={colors.primary} strokeWidth={2} />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
          {/* Coordinates fallback so info is never lost */}
          <Text style={styles.coordsFallback}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
            {radiusKm > 0 ? `  ·  Rayon ${radiusKm} km` : ''}
          </Text>
        </View>
      )}

      {/* Map */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <WebView
          key={key}
          source={{ html }}
          style={styles.webview}
          onMessage={handleMessage}
          onError={handleError}
          onHttpError={handleError}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          originWhitelist={['*']}
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs
          allowFileAccess
        />
      </Animated.View>

      {/* Read-only badge */}
      {!interactive && status === 'ready' && (
        <View style={styles.badge} pointerEvents="none">
          <MapPin size={10} color={colors.primary} strokeWidth={2} />
          <Text style={styles.badgeText}>Zone de mission</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius:    radius.xl,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.border,
    backgroundColor: colors.backgroundElevated,
    position:        'relative',
  },
  webview:   { flex: 1, backgroundColor: 'transparent' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[2],
    backgroundColor: colors.backgroundElevated,
    zIndex:          10,
    paddingHorizontal: spacing[5],
  },
  overlayText:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  errorTitle:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing[1] },
  errorSub:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  retryBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    marginTop:         spacing[2],
    backgroundColor:   colors.primarySurface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[2],
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
  },
  retryText:       { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  coordsFallback:  {
    marginTop:  spacing[3],
    fontFamily: fontFamily.mono,
    fontSize:   10,
    color:      colors.textMuted,
    textAlign:  'center',
  },

  badge: {
    position:          'absolute',
    bottom:            spacing[3],
    left:              spacing[3],
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1],
    backgroundColor:   colors.background + 'E6',
    borderRadius:      radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1] + 2,
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
  },
  badgeText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
});
