/**
 * MapLocationPicker - enterprise-grade OSM/Leaflet map picker.
 *
 * THE real scroll fix:
 *   onInteractionChange(true)  -> map unlocked  -> parent ScrollView sets scrollEnabled=false
 *   onInteractionChange(false) -> map re-locked -> parent ScrollView sets scrollEnabled=true
 * This gives Leaflet full ownership of vertical pan gestures when active.
 *
 * [FIX H2] Location permission handling now uses react-native-permissions on
 * BOTH platforms via check()/request()/openSettings(), instead of the old
 * Android-only PermissionsAndroid.request() with no recovery path. When the OS
 * has permanently blocked the permission (Android "Don't ask again" / iOS denied
 * in Settings), we surface a confirm dialog that deep-links to system Settings
 * so the user can actually re-grant — previously this was a silent dead end.
 *
 * [FIX H2b] iOS shows its system prompt exactly once per install -- a user
 * who dismisses it without understanding why we're asking has no second
 * chance, only the BLOCKED dead-end above. We now show a custom rationale
 * dialog (perm_title/perm_message) BEFORE triggering the system prompt, but
 * only on iOS and only the first time (status === DENIED, i.e. not yet
 * decided). Android's system dialog already carries clear, re-askable
 * permission text, so no extra screen is added there.
 *
 * [FIX H3] Rebuilt on the shared <LeafletMapView> shell: Leaflet's JS/CSS are
 * inlined from the bundle instead of fetched from unpkg at runtime, and this
 * picker gains real error/retry UI for the first time — previously a stalled
 * Leaflet load just left the "loading…" spinner running forever with no way
 * out short of leaving the screen. The old WebView onLoad fallback (which
 * flipped mapReady even if the 'ready' postMessage never arrived) is removed:
 * it existed to paper over a slow/failed <script src> fetch, which can no
 * longer happen now that Leaflet ships inline in the HTML string itself —
 * the IIFE that calls signalReady() runs synchronously once the WebView
 * parses the document, with no separate network round-trip in between.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from '@i18n';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, Platform,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {
  check, request, openSettings,
  PERMISSIONS, RESULTS,
  type Permission, type PermissionStatus,
} from 'react-native-permissions';
import { MapPin, Navigation, Check, Unlock, X } from 'lucide-react-native';
import { useToast } from '@hooks/useToast';
import { useConfirmDialog } from '@hooks/useConfirmDialog';
import { geocodingApi } from '@api/endpoints/geocoding';
import { config } from '@config';
import { colors, palette } from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { LeafletMapView, type LeafletMapViewHandle } from './LeafletMapView';

interface Coords { latitude: number; longitude: number }

interface Props {
  latitude?:            number;
  longitude?:           number;
  onSelect:             (coords: Coords, address?: string) => void;
  onInteractionChange?: (active: boolean) => void;
}


/** Foreground location permission for the active platform. */
const LOCATION_PERMISSION: Permission = Platform.select({
  ios:     PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  default: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
});

// ---------------------------------------------------------------------------
//  Leaflet body script (runs once Leaflet + the map instance are ready)
// ---------------------------------------------------------------------------
const PICKER_EXTRA_STYLE = `
  .pin-outer{width:40px;height:40px;position:relative;display:flex;align-items:center;justify-content:center;}
  .pin-circle{width:36px;height:36px;background:linear-gradient(135deg,#d4a84b,#bc933b);border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.5),0 0 0 4px rgba(188,147,59,.25);}
  .pin-circle svg{pointer-events:none;}
  @keyframes ripple{from{transform:scale(.6);opacity:.7;}to{transform:scale(2.2);opacity:0;}}
  .pin-ripple{position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(188,147,59,.35);animation:ripple .55s ease-out forwards;pointer-events:none;}
  .leaflet-tile{transition:opacity .25s ease!important;}
  .leaflet-marker-icon{transition:transform .18s cubic-bezier(.25,.8,.25,1)!important;}
`;

function buildPickerBodyScript(
  lat: number | undefined,
  lng: number | undefined,
  tileUrl: string,
): string {
  const hasPin = lat != null && lng != null;

  return `
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('${tileUrl}',{maxZoom:19,attribution:'',keepBuffer:4}).addTo(map);

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
  signalReady();
  `;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------
export const MapLocationPicker: React.FC<Props> = ({
  latitude, longitude, onSelect, onInteractionChange,
}) => {
  const { t } = useTranslation('map_picker');
  const toast    = useToast();
  const confirm  = useConfirmDialog();
  const mapRef   = useRef<LeafletMapViewHandle>(null);
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
      // Backend proxies the official IGN Géoplateforme / BAN reverse endpoint.
      const res = await geocodingApi.reverseGeocode(lat, lon);
      const r = res.data.data;
      // Prefer the BAN short street-level name, fall back to the full label.
      setAddress(r?.shortName || r?.displayName || null);
    } catch { setAddress(null); } finally { setLoadingGeo(false); }
  }, []);

  // The shell already intercepts 'ready' for its own loading/error chrome;
  // this onMessage only needs to handle this screen's own message type.
  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'coords') {
        const coords = { latitude: msg.lat, longitude: msg.lng };
        setMarker(coords); setConfirmed(false);
        reverseGeocode(msg.lat, msg.lng);
      }
    } catch { /* ignore */ }
  }, [reverseGeocode]);

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

  // ── [FIX H2] Read the current GPS fix once permission is confirmed granted ──
  const runGeolocation = useCallback(() => {
    setLocating(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lt, longitude: ln } = pos.coords;
        setLocating(false);
        mapRef.current?.inject(`window.setMarker(${lt},${ln});`);
      },
      (err) => {
        const msg =
          err.code === 1 ? t('perm_denied') :
          err.code === 2 ? t('position_unavailable') :
                           t('timeout_retry');
        setLocating(false);
        toast.error(msg, { title: t('locate_failed_title') });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [t, toast]);

  // ── [FIX H2] Offer to deep-link into system Settings when blocked ──────────
  const promptOpenSettings = useCallback(async () => {
    const ok = await confirm({
      title:        t('perm_blocked_title'),
      message:      t('perm_blocked_body'),
      confirmLabel: t('perm_open_settings'),
      cancelLabel:  t('perm_cancel'),
    });
    if (ok) {
      try { await openSettings(); } catch { /* some OEMs throw — best effort */ }
    }
  }, [confirm, t]);

  // ── [FIX H2b] iOS-only pre-permission rationale, shown once before the
  // system prompt fires. Returns true if the user wants to proceed to the
  // OS dialog, false if they cancelled (in which case we stop — no request()
  // call, so the one-shot iOS prompt is preserved for a moment the user
  // actually expects it).
  const promptRationale = useCallback(async () => {
    const ok = await confirm({
      title:        t('perm_title'),
      message:      t('perm_message'),
      confirmLabel: t('perm_allow'),
      cancelLabel:  t('perm_cancel'),
    });
    return ok;
  }, [confirm, t]);

  const handleLocateMe = useCallback(async () => {
    if (!mapReady) return;

    try {
      // 1. Check the current authorization status first.
      let status: PermissionStatus = await check(LOCATION_PERMISSION);

      // 2. If not yet decided, show our own rationale FIRST on iOS — the
      //    system prompt only fires once per install, so we want the user's
      //    one shot at it to land with context, not a surprise dialog.
      //    Android's system dialog is already clear and re-askable, so we
      //    skip straight to request() there (matches original H2 behaviour).
      if (status === RESULTS.DENIED) {
        if (Platform.OS === 'ios') {
          const proceed = await promptRationale();
          if (!proceed) return;
        }
        status = await request(LOCATION_PERMISSION);
      }

      // 3. Branch on the resolved status.
      switch (status) {
        case RESULTS.GRANTED:
        case RESULTS.LIMITED:
          runGeolocation();
          return;

        case RESULTS.BLOCKED:
          // Permanently denied (Android "Don't ask again" / iOS Settings).
          await promptOpenSettings();
          return;

        case RESULTS.UNAVAILABLE:
          toast.warning(t('perm_unavailable'), { title: t('locate_failed_title') });
          return;

        case RESULTS.DENIED:
        default:
          // User dismissed the prompt this time — soft denial, no settings link.
          toast.warning(t('perm_settings_hint'), { title: t('perm_denied_title') });
          return;
      }
    } catch {
      toast.error(t('timeout_retry'), { title: t('locate_failed_title') });
    }
  }, [mapReady, runGeolocation, promptOpenSettings, promptRationale, toast, t]);

  const tileUrl = config.maps.tileUrlTemplate;
  const bodyScript = useMemo(
    () => buildPickerBodyScript(latitude, longitude, tileUrl),
    [latitude, longitude, tileUrl],
  );

  const initialZoom = latitude != null && longitude != null ? 14 : 6;
  const centerLat = latitude ?? 46.6034; // France centroid fallback
  const centerLng = longitude ?? 1.8883;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('label')}</Text>
      <Text style={styles.hint}>{t('hint')}</Text>

      <View style={styles.mapContainer}>
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents={locked ? 'none' : 'auto'}
        >
          <LeafletMapView
            ref={mapRef}
            centerLat={centerLat}
            centerLng={centerLng}
            initialZoom={initialZoom}
            zoomControl={false}
            dragging
            bodyScript={bodyScript}
            extraStyle={PICKER_EXTRA_STYLE}
            onMessage={handleMessage}
            onReady={() => setMapReady(true)}
            onMapError={() => setMapReady(false)}
          />
        </View>

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
  mapContainer:     { height: 300, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundElevated, position: 'relative' },
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
