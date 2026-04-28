/**
 * MapLocationPicker - enterprise-grade OSM/Leaflet map picker.
 *
 * THE real scroll fix:
 *   onInteractionChange(true)  -> map unlocked  -> parent ScrollView sets scrollEnabled=false
 *   onInteractionChange(false) -> map re-locked -> parent ScrollView sets scrollEnabled=true
 * This gives Leaflet full ownership of vertical pan gestures when active.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from '@i18n';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, Platform, PermissionsAndroid, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { MapPin, Navigation, Check, Unlock, X } from 'lucide-react-native';
import axios from 'axios';
import { colors, palette } from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Coords { latitude: number; longitude: number }

interface Props {
  latitude?:            number;
  longitude?:           number;
  onSelect:             (coords: Coords, address?: string) => void;
  onInteractionChange?: (active: boolean) => void;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
// ---------------------------------------------------------------------------
//  Leaflet HTML
// ---------------------------------------------------------------------------
function buildLeafletHTML(lat?: number, lng?: number): string {
  const hasPin    = lat != null && lng != null;
  const centerLat = hasPin ? lat  : 46.6034;
  const centerLng = hasPin ? lng  : 1.8883;
  const zoom      = hasPin ? 14   : 6;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body,#map{width:100%;height:100%;background:#071e38;}
  .leaflet-control-attribution{display:none!important;}
  .leaflet-control-zoom a{background:#0d2a45!important;color:#bc933b!important;border-color:#1e2d45!important;transition:background .15s,color .15s;}
  .leaflet-control-zoom a:hover{background:#1a3d5e!important;color:#d4a84b!important;}
  .leaflet-tile{transition:opacity .25s ease!important;}
  .leaflet-marker-icon{transition:transform .18s cubic-bezier(.25,.8,.25,1)!important;}
  .pin-outer{width:40px;height:40px;position:relative;display:flex;align-items:center;justify-content:center;}
  .pin-circle{width:36px;height:36px;background:linear-gradient(135deg,#d4a84b,#bc933b);border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.5),0 0 0 4px rgba(188,147,59,.25);}
  .pin-circle svg{pointer-events:none;}
  @keyframes ripple{from{transform:scale(.6);opacity:.7;}to{transform:scale(2.2);opacity:0;}}
  .pin-ripple{position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(188,147,59,.35);animation:ripple .55s ease-out forwards;pointer-events:none;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var map=L.map('map',{
    zoomControl:false,
    inertia:true,inertiaDeceleration:2000,easeLinearity:.20,
    zoomAnimation:true,markerZoomAnimation:true,fadeAnimation:true,
  }).setView([${centerLat},${centerLng}],${zoom});
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'',keepBuffer:4}).addTo(map);
  function makeIcon(r){
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    return L.divIcon({
      className:'',
      html:'<div class="pin-outer">'+(r?'<div class="pin-ripple"></div>':'')+'<div class="pin-circle">'+svg+'</div></div>',
      iconSize:[40,40],iconAnchor:[20,40],popupAnchor:[0,-44],
    });
  }
  function send(type,extra){ var msg=Object.assign({type:type},extra||{}); window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  var marker=null;
  ${hasPin ? `marker=L.marker([${lat},${lng}],{icon:makeIcon(false),draggable:true}).addTo(map);attachDrag(marker);` : ''}
  function attachDrag(m){
    m.off('dragend').on('dragend',function(e){ m.setIcon(makeIcon(false)); var p=e.target.getLatLng(); send('coords',{lat:p.lat,lng:p.lng}); });
  }
  map.on('click',function(e){
    var lt=e.latlng.lat,ln=e.latlng.lng;
    if(marker){map.panTo([lt,ln],{animate:true,duration:.3});marker.setLatLng([lt,ln]);}
    else{marker=L.marker([lt,ln],{icon:makeIcon(true),draggable:true}).addTo(map);attachDrag(marker);}
    marker.setIcon(makeIcon(true)); setTimeout(function(){marker.setIcon(makeIcon(false));},600);
    send('coords',{lat:lt,lng:ln});
  });
  window.setMarker=function(lt,ln){
    map.flyTo([lt,ln],15,{animate:true,duration:.6});
    var place=function(){ marker.setLatLng([lt,ln]); marker.setIcon(makeIcon(true)); setTimeout(function(){marker.setIcon(makeIcon(false));},600); };
    if(marker){ setTimeout(place,350); } else { setTimeout(function(){ marker=L.marker([lt,ln],{icon:makeIcon(true),draggable:true}).addTo(map); attachDrag(marker); setTimeout(function(){marker.setIcon(makeIcon(false));},600); },350); }
    send('coords',{lat:lt,lng:ln});
  };
  send('ready');
})();
</script>
</body>
</html>`;
}
// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------
export const MapLocationPicker: React.FC<Props> = ({
  latitude, longitude, onSelect, onInteractionChange,
}) => {
  const { t } = useTranslation('map_picker');
  const webRef   = useRef<WebView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lockAnim = useRef(new Animated.Value(1)).current;

  const [marker,     setMarker]     = useState<Coords | null>(
    latitude && longitude ? { latitude, longitude } : null,
  );
  const [address,    setAddress]    = useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [confirmed,  setConfirmed]  = useState(!!latitude && !!longitude);
  const [mapReady,   setMapReady]   = useState(false);
  const [locked,     setLocked]     = useState(true);
  const [locating,   setLocating]   = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    setLoadingGeo(true); setAddress(null);
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
    } catch { setAddress(null); } finally { setLoadingGeo(false); }
  }, []);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setMapReady(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } else if (msg.type === 'coords') {
        const coords = { latitude: msg.lat, longitude: msg.lng };
        setMarker(coords); setConfirmed(false);
        reverseGeocode(msg.lat, msg.lng);
      }
    } catch { /* ignore */ }
  }, [fadeAnim, reverseGeocode]);

  const handleLoad = useCallback(() => {
    if (!mapReady) {
      setMapReady(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [fadeAnim, mapReady]);

  const unlock = useCallback(() => {
    setLocked(false);
    onInteractionChange?.(true);   // parent: scrollEnabled = false
    Animated.timing(lockAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [lockAnim, onInteractionChange]);

  const lock = useCallback(() => {
    setLocked(true);
    onInteractionChange?.(false);  // parent: scrollEnabled = true
    Animated.timing(lockAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [lockAnim, onInteractionChange]);

  const handleConfirm = useCallback(() => {
    if (!marker) return;
    setConfirmed(true); onSelect(marker, address ?? undefined); lock();
  }, [marker, address, onSelect, lock]);

  const handleLocateMe = useCallback(async () => {
    if (!mapReady) return;

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title:   'Localisation requise',
          message: 'SecurBook a besoin de votre position pour centrer la carte.',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Annuler',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission refusee', 'Activez la localisation dans les reglages.');
        return;
      }
    }

    setLocating(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lt, longitude: ln } = pos.coords;
        setLocating(false);
        webRef.current?.injectJavaScript(`window.setMarker(${lt},${ln});true;`);
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Permission de localisation refusee.' :
          err.code === 2 ? 'Position introuvable. Verifiez que le GPS est active.' :
                           'Delai depasse. Reessayez.';
        setLocating(false);
        Alert.alert('Localisation impossible', msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [mapReady]);
  const html = buildLeafletHTML(latitude, longitude);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('label')}</Text>
      <Text style={styles.hint}>{t('hint')}</Text>

      <View style={styles.mapContainer}>
        {!mapReady && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.mapLoadingText}>{t('loading')}</Text>
          </View>
        )}

        <Animated.View style={[styles.webViewWrap, { opacity: fadeAnim }]}>
          <WebView
            ref={webRef}
            source={{ html }}
            style={styles.map}
            onMessage={handleMessage}
            onLoad={handleLoad}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            originWhitelist={['*']}
            mixedContentMode="always"
            allowUniversalAccessFromFileURLs
            allowFileAccess
            nestedScrollEnabled={false}
            pointerEvents={locked ? 'none' : 'auto'}
          />
        </Animated.View>

        <Animated.View
          style={[styles.lockOverlay, { opacity: lockAnim }]}
          pointerEvents={locked ? 'auto' : 'none'}
        >
          <TouchableOpacity style={styles.lockOverlayInner} onPress={unlock} activeOpacity={0.85}>
            <View style={styles.lockPill}>
              <Unlock size={13} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.lockPillText}>{t('unlock_hint')}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {!locked && mapReady && (
          <>
            <TouchableOpacity style={styles.closeLockBtn} onPress={lock} activeOpacity={0.85}>
              <X size={14} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe} activeOpacity={0.85} disabled={locating}>
              {locating
                ? <ActivityIndicator size='small' color={colors.primary} />
                : <Navigation size={16} color={colors.primary} strokeWidth={2} />}

            </TouchableOpacity>
            {!marker && (
              <View style={styles.tapHint} pointerEvents="none">
                <Text style={styles.tapHintText}>{t('hint').split('·')[0].trim()}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {marker && (
        <View style={[styles.preview, confirmed && styles.previewConfirmed]}>
          <MapPin size={16} color={confirmed ? colors.success : colors.primary} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
          <View style={styles.previewLeft}>
            {loadingGeo
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <>
                  <Text style={styles.coords}>{marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</Text>
                  {address && <Text style={styles.addrText} numberOfLines={2}>{address}</Text>}
                </>
            }
          </View>
          {!confirmed
            ? <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                <Check size={14} color="#fff" strokeWidth={2.5} />
                <Text style={styles.confirmText}>{t('validate_btn')}</Text>
              </TouchableOpacity>
            : <View style={styles.confirmedBadge}>
                <Check size={12} color={colors.success} strokeWidth={2.5} />
                <Text style={styles.confirmedText}>{t('validated')}</Text>
              </View>
          }
        </View>
      )}
    </View>
  );
};
// ---------------------------------------------------------------------------
//  Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  wrapper:          { marginBottom: spacing[3] },
  label:            { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:             { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing[1], marginBottom: spacing[2] },
  mapContainer:     { height: 300, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundElevated },
  webViewWrap:      { flex: 1 },
  map:              { flex: 1, backgroundColor: 'transparent' },
  mapLoading:       { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: spacing[3], zIndex: 10, backgroundColor: colors.backgroundElevated },
  mapLoadingText:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  lockOverlay:      { ...StyleSheet.absoluteFillObject, zIndex: 30 },
  lockOverlayInner: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing[4] },
  lockPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.overlay, borderWidth: 1, borderColor: colors.borderPrimary,
    borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] + 2,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  lockPillText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  closeLockBtn: {
    position: 'absolute', top: spacing[3], left: spacing[3],
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  locateBtn: {
    position: 'absolute', top: spacing[3], right: spacing[3],
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  tapHint: {
    position: 'absolute', bottom: spacing[3], alignSelf: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.full, zIndex: 5,
  },
  tapHintText:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  preview:          { flexDirection: 'row', alignItems: 'center', marginTop: spacing[3], backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderPrimary, padding: spacing[3], gap: spacing[2] },
  previewConfirmed: { borderColor: colors.success, backgroundColor: 'rgba(74,222,128,0.10)' },
  previewLeft:      { flex: 1, gap: 3 },
  coords:           { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textPrimary },
  addrText:         { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexShrink: 0,
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  confirmText:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: palette.white },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: colors.success, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexShrink: 0 },
  confirmedText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success },
});
