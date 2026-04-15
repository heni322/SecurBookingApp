/**
 * MapLocationPicker — interactive OSM map via Leaflet.js in WebView.
 * No Google Maps API key required. Tap to place marker, drag to move.
 * Reverse geocoding via Nominatim.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin, Navigation, Check } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Coords { latitude: number; longitude: number }

interface Props {
  latitude?:  number;
  longitude?: number;
  onSelect:   (coords: Coords, address?: string) => void;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

// ── Leaflet HTML — self-contained, communicates via postMessage ───────────────
function buildLeafletHTML(lat?: number, lng?: number): string {
  const hasPin  = lat != null && lng != null;
  const centerLat = hasPin ? lat  : 46.6034;
  const centerLng = hasPin ? lng  : 1.8883;
  const zoom      = hasPin ? 14   : 6;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#071e38; }
  .leaflet-control-attribution { display:none !important; }
  .leaflet-control-zoom a {
    background:#071e38 !important; color:#bc933b !important;
    border-color:#1a3d5e !important;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl:true }).setView([${centerLat},${centerLng}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19, attribution:''
  }).addTo(map);

  var pinIcon = L.divIcon({
    className:'',
    html: '<div style="width:36px;height:36px;background:#bc933b;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);"><svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#fff\\' stroke-width=\\'2.2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\\'></path><circle cx=\\'12\\' cy=\\'10\\' r=\\'3\\'></circle></svg></div>',
    iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-36]
  });

  var marker = null;
  ${hasPin ? `
  marker = L.marker([${lat},${lng}], { icon:pinIcon, draggable:true }).addTo(map);
  marker.on('dragend', function(e){
    var p = e.target.getLatLng();
    sendCoords(p.lat, p.lng);
  });` : ''}

  function sendCoords(lat, lng) {
    var msg = JSON.stringify({ type:'coords', lat:lat, lng:lng });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
  }

  map.on('click', function(e){
    var lat = e.latlng.lat, lng = e.latlng.lng;
    if (marker) { marker.setLatLng([lat, lng]); }
    else { marker = L.marker([lat,lng], { icon:pinIcon, draggable:true }).addTo(map); }
    marker.off('dragend').on('dragend', function(ev){
      var p = ev.target.getLatLng();
      sendCoords(p.lat, p.lng);
    });
    sendCoords(lat, lng);
  });

  // expose setMarker for external calls
  window.setMarker = function(lat, lng) {
    if (marker) { marker.setLatLng([lat,lng]); }
    else { marker = L.marker([lat,lng], { icon:pinIcon, draggable:true }).addTo(map); }
    map.setView([lat,lng], 15);
    sendCoords(lat, lng);
  };
</script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const MapLocationPicker: React.FC<Props> = ({ latitude, longitude, onSelect }) => {
  const webRef   = useRef<WebView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [marker,      setMarker]      = useState<Coords | null>(
    latitude && longitude ? { latitude, longitude } : null,
  );
  const [address,     setAddress]     = useState<string | null>(null);
  const [loadingGeo,  setLoadingGeo]  = useState(false);
  const [confirmed,   setConfirmed]   = useState(!!latitude && !!longitude);
  const [mapReady,    setMapReady]    = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    setLoadingGeo(true);
    setAddress(null);
    try {
      const res = await axios.get(NOMINATIM, {
        params:  { lat, lon, format: 'json', 'accept-language': 'fr' },
        headers: { 'User-Agent': 'SecurBook/1.0' },
      });
      const d = res.data?.address ?? {};
      const parts = [
        d.house_number && d.road ? `${d.house_number} ${d.road}` : d.road,
        d.postcode,
        d.city ?? d.town ?? d.village,
      ].filter(Boolean);
      setAddress(parts.join(', ') || res.data?.display_name?.split(',').slice(0,3).join(',') || null);
    } catch { setAddress(null); }
    finally  { setLoadingGeo(false); }
  }, []);

  // Message from Leaflet → RN
  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'coords') {
        const coords = { latitude: msg.lat, longitude: msg.lng };
        setMarker(coords);
        setConfirmed(false);
        reverseGeocode(msg.lat, msg.lng);
      }
    } catch { /* ignore */ }
  }, [reverseGeocode]);

  const handleMapLoad = useCallback(() => {
    setMapReady(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleConfirm = useCallback(() => {
    if (!marker) return;
    setConfirmed(true);
    onSelect(marker, address ?? undefined);
  }, [marker, address, onSelect]);

  // Locate me via RN geolocation → inject into WebView
  const handleLocateMe = useCallback(() => {
    let Geo: any;
    try { Geo = require('@react-native-community/geolocation').default; } catch { return; }
    Geo.getCurrentPosition(
      (pos: any) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        webRef.current?.injectJavaScript(`window.setMarker(${lat}, ${lon}); true;`);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const html = buildLeafletHTML(latitude, longitude);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Position GPS *</Text>
      <Text style={styles.hint}>Touchez la carte pour placer le marqueur · Glissez pour déplacer</Text>

      {/* Map container */}
      <View style={styles.mapContainer}>
        {/* Loading overlay */}
        {!mapReady && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.mapLoadingText}>Chargement de la carte…</Text>
          </View>
        )}

        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <WebView
            ref={webRef}
            source={{ html }}
            style={styles.map}
            onMessage={handleMessage}
            onLoad={handleMapLoad}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            originWhitelist={['*']}
            mixedContentMode="always"
            // Allow loading Leaflet CDN
            allowUniversalAccessFromFileURLs
            allowFileAccess
          />
        </Animated.View>

        {/* Locate me button */}
        <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe} activeOpacity={0.85}>
          <Navigation size={16} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>

        {/* Tap hint when no marker yet */}
        {mapReady && !marker && (
          <View style={styles.tapHint} pointerEvents="none">
            <Text style={styles.tapHintText}>Touchez la carte pour placer</Text>
          </View>
        )}
      </View>

      {/* Address + confirm bar */}
      {marker && (
        <View style={[styles.preview, confirmed && styles.previewConfirmed]}>
          <View style={styles.previewLeft}>
            {loadingGeo ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.coords}>
                  {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                </Text>
                {address && (
                  <Text style={styles.addrText} numberOfLines={2}>{address}</Text>
                )}
              </>
            )}
          </View>

          {!confirmed ? (
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Check size={14} color="#fff" strokeWidth={2.5} />
              <Text style={styles.confirmText}>Valider</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmedBadge}>
              <Check size={12} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.confirmedText}>Validé</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[3] },
  label: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily:   fontFamily.body,
    fontSize:     fontSize.xs,
    color:        colors.textMuted,
    marginTop:    spacing[1],
    marginBottom: spacing[2],
  },

  mapContainer: {
    height:         280,
    borderRadius:   radius.xl,
    overflow:       'hidden',
    borderWidth:    1,
    borderColor:    colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  map: { flex: 1, backgroundColor: 'transparent' },

  mapLoading: {
    position:       'absolute',
    inset:          0,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing[3],
    zIndex:         10,
    backgroundColor: colors.backgroundElevated,
  },
  mapLoadingText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  locateBtn: {
    position:        'absolute',
    top:             spacing[3],
    right:           spacing[3],
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.backgroundElevated,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.3,
    shadowRadius:    4,
    zIndex:          20,
  },

  tapHint: {
    position:        'absolute',
    bottom:          spacing[3],
    alignSelf:       'center',
    backgroundColor: 'rgba(5,23,43,0.75)',
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[2],
    borderRadius:    radius.full,
    zIndex:          5,
  },
  tapHintText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.primary,
  },

  preview: {
    flexDirection:   'row',
    alignItems:      'center',
    marginTop:       spacing[3],
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    padding:         spacing[3],
    gap:             spacing[3],
  },
  previewConfirmed: {
    borderColor:     colors.success,
    backgroundColor: colors.successSurface,
  },
  previewLeft: { flex: 1, gap: 3 },
  coords: {
    fontFamily: fontFamily.mono,
    fontSize:   fontSize.xs,
    color:      colors.primary,
  },
  addrText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },

  confirmBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    backgroundColor:   colors.primary,
    borderRadius:      radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    flexShrink:        0,
    shadowColor:       '#bc933b',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.4,
    shadowRadius:      6,
    elevation:         3,
  },
  confirmText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.xs,
    color:      '#fff',
  },
  confirmedBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1],
    backgroundColor:   colors.successSurface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    flexShrink:        0,
  },
  confirmedText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.success,
  },
});
