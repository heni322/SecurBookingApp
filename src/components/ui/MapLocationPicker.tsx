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
 *
 * [FIX 2026-10-07] "Localisation impossible — Délai dépassé" on device:
 *  ROOT CAUSE: a single getCurrentPosition({ enableHighAccuracy: true,
 *  timeout: 10000, maximumAge: 0 }) with no provider configured. On Android
 *  the community module then uses the raw LocationManager GPS provider only;
 *  indoors / with a cold GPS a fix routinely takes 15-60 s, and maximumAge:0
 *  refused the perfectly good cached network fix the phone already had.
 *  FIX: fused provider (Play Services when present) + two-stage locate:
 *   1. fast coarse fix (network/Wi-Fi, cache ≤ 2 min accepted, 8 s);
 *   2. only if that fails, a high-accuracy GPS attempt with 20 s;
 *   3. a coarse fix (> 100 m) is silently refined in the background unless
 *      the user has already moved the pin themselves.
 *  Failure copy now tells the user what to do (tap the map) instead of
 *  "try again", which would fail the same way.
 *
 * [FIX 2026-10-07] Other issues on the "Lieu" step:
 *  - The map ignored the city / postcode typed above it (Paris, 75001 while the
 *    map sat on North Africa). New `focusQuery` prop re-centres the map on the
 *    typed place (debounced, via our BAN geocoder) until a pin exists.
 *  - Every coordinate change from the address search rebuilt the HTML and
 *    remounted the whole WebView (flash + reload). The page is now built once
 *    from the initial coords; later changes are injected (showPin).
 *  - Leaflet +/- control collided with the "tap the map" hint pill. Removed;
 *    pinch-to-zoom is the native gesture.
 *
 * [FIX 2026-10-07 · Create Mission audit]
 *  - A pin placed or dragged on the map was only reported to the form when the
 *    user ALSO tapped "Valider". Without it the form kept the previous GPS
 *    point while the map showed the new one, and that stale point was
 *    submitted. Every placement is now committed immediately; the extra
 *    confirm tap is gone (one less step, no silent divergence).
 *  - The reverse-geocoded place (street, city, postcode) is passed up with the
 *    coordinates, so the parent can keep address / city / postcode coherent
 *    with the pin instead of only overwriting the street line.
 *  - Out-of-order reverse-geocode responses (fast successive taps) are
 *    dropped, so an older lookup can never label a newer pin.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
import type { GeocodingResult } from '@api/endpoints/geocoding';
import { useToast } from '@hooks/useToast';
import { useConfirmDialog } from '@hooks/useConfirmDialog';
import { geocodingApi } from '@api/endpoints/geocoding';
import { config } from '@config';
import { colors, palette } from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { LeafletMapView, type LeafletMapViewHandle } from './LeafletMapView';

interface Coords { latitude: number; longitude: number }

/** Place resolved at the pin (BAN reverse geocode). Absent when lookup fails. */
export type PickedPlace = Pick<GeocodingResult, 'shortName' | 'city' | 'zipCode'>;

interface Props {
  latitude?:            number;
  longitude?:           number;
  /**
   * Called as soon as the pin is placed / moved (place undefined), then again
   * with the resolved place once the reverse geocode answers.
   */
  onSelect:             (coords: Coords, place?: PickedPlace) => void;
  onInteractionChange?: (active: boolean) => void;
  /**
   * Free-text place (e.g. "75001 Paris") the map should centre on while no
   * pin has been placed yet. Geocoded with a debounce; never places a pin.
   */
  focusQuery?:          string;
}


// Prefer the fused provider (Play Services) on Android: it returns a network /
// Wi-Fi fix in ~1 s where the raw GPS provider can take a minute indoors.
// Permissions are handled explicitly below via react-native-permissions.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

type Fix = { latitude: number; longitude: number; accuracy: number };

const getFix = (opts: { enableHighAccuracy: boolean; timeout: number; maximumAge: number }) =>
  new Promise<Fix>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 9999,
      }),
      reject,
      opts,
    );
  });

/** Coarse accuracy above which we try to refine in the background (metres). */
const REFINE_ABOVE_M = 100;

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
  // Prop-driven pin (address picked in the search field): no echo back.
  window.showPin=function(lt,ln){
    map.setView([lt,ln],16,{animate:true});
    if(marker){ marker.setLatLng([lt,ln]); }
    else { marker=L.marker([lt,ln],{icon:makeIcon(false),draggable:true}).addTo(map); attachDrag(marker); }
  };
  // Centre on a place without placing a pin (typed city / postcode).
  window.focusArea=function(lt,ln,z){ if(!marker){ map.flyTo([lt,ln],z||13,{animate:true,duration:.6}); } };
  signalReady();
  `;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------
export const MapLocationPicker: React.FC<Props> = ({
  latitude, longitude, onSelect, onInteractionChange, focusQuery,
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
  const [mapReady,   setMapReady]   = useState(false);
  const [locked,     setLocked]     = useState(true);
  const [locating,   setLocating]   = useState(false);

  const mountedRef      = useRef(true);
  // True once the user moves the pin by hand — a background GPS refinement
  // must never overwrite a deliberate placement.
  const userPlacedRef   = useRef(false);
  // Coords we last pushed into the map ourselves, to tell our own echoes apart.
  const lastLocatedRef  = useRef<Coords | null>(null);
  useEffect(() => () => { mountedRef.current = false; }, []);
  // Latest reverse-geocode request; older answers are discarded.
  const geoReqRef = useRef(0);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    const reqId = ++geoReqRef.current;
    setLoadingGeo(true); setAddress(null);
    try {
      // Backend proxies the official IGN Géoplateforme / BAN reverse endpoint.
      const res = await geocodingApi.reverseGeocode(lat, lon);
      if (!mountedRef.current || reqId !== geoReqRef.current) return;
      const r = res.data.data;
      // Prefer the BAN short street-level name, fall back to the full label.
      setAddress(r?.shortName || r?.displayName || null);
      if (r) {
        onSelect(
          { latitude: lat, longitude: lon },
          { shortName: r.shortName || r.displayName, city: r.city, zipCode: r.zipCode },
        );
      }
    } catch {
      if (reqId === geoReqRef.current && mountedRef.current) setAddress(null);
    } finally {
      if (reqId === geoReqRef.current && mountedRef.current) setLoadingGeo(false);
    }
  }, [onSelect]);

  // The shell already intercepts 'ready' for its own loading/error chrome;
  // this onMessage only needs to handle this screen's own message type.
  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'coords') {
        const coords = { latitude: msg.lat, longitude: msg.lng };
        const own = lastLocatedRef.current;
        if (!own || Math.abs(own.latitude - msg.lat) > 1e-6 || Math.abs(own.longitude - msg.lng) > 1e-6) {
          userPlacedRef.current = true;
        }
        setMarker(coords);
        // Commit immediately — the form must never hold a different point
        // than the one the user sees on the map.
        onSelect(coords);
        reverseGeocode(msg.lat, msg.lng);
      }
    } catch { /* ignore */ }
  }, [reverseGeocode, onSelect]);

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

  // ── [FIX H2] Read the current GPS fix once permission is confirmed granted ──
  const placeLocated = useCallback((fix: Fix) => {
    lastLocatedRef.current = { latitude: fix.latitude, longitude: fix.longitude };
    mapRef.current?.inject(`window.setMarker(${fix.latitude},${fix.longitude});`);
  }, []);

  const runGeolocation = useCallback(async () => {
    setLocating(true);
    userPlacedRef.current = false;
    let fix: Fix;
    try {
      try {
        // 1. Fast, coarse fix: network/Wi-Fi, recent cache accepted.
        fix = await getFix({ enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 });
      } catch (e: any) {
        if (e?.code === 1) throw e;               // permission: don't retry
        // 2. No coarse fix available → give real GPS a fair chance.
        fix = await getFix({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 300_000 });
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setLocating(false);
      const msg =
        err?.code === 1 ? t('perm_denied') :
        err?.code === 2 ? t('position_unavailable') :
                          t('timeout_retry');
      toast.error(msg, { title: t('locate_failed_title') });
      return;
    }
    if (!mountedRef.current) return;
    setLocating(false);
    placeLocated(fix);

    // 3. Coarse fix → quietly refine with GPS unless the user moves the pin.
    if (fix.accuracy > REFINE_ABOVE_M) {
      getFix({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 })
        .then((better) => {
          if (!mountedRef.current || userPlacedRef.current) return;
          if (better.accuracy < fix.accuracy) placeLocated(better);
        })
        .catch(() => { /* coarse fix stays — nothing to tell the user */ });
    }
  }, [t, toast, placeLocated]);

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

  // Built ONCE from the initial coordinates. Later prop changes are injected
  // (see effects below) — rebuilding the HTML remounted the whole WebView.
  const initialRef = useRef({ latitude, longitude });
  const tileUrl = config.maps.tileUrlTemplate;
  const bodyScript = useMemo(
    () => buildPickerBodyScript(initialRef.current.latitude, initialRef.current.longitude, tileUrl),
    [tileUrl],
  );

  // Coordinates set from outside (address search) → move the pin in place.
  useEffect(() => {
    if (!mapReady || latitude == null || longitude == null) return;
    if (marker && Math.abs(marker.latitude - latitude) < 1e-6 && Math.abs(marker.longitude - longitude) < 1e-6) return;
    mapRef.current?.inject(`window.showPin(${latitude},${longitude});`);
    setMarker({ latitude, longitude });
    // A pin set from outside (address search) carries its own label.
    geoReqRef.current++;
    setLoadingGeo(false);
    setAddress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, mapReady]);

  // Typed city / postcode → centre the map there while no pin exists.
  useEffect(() => {
    const q = focusQuery?.trim() ?? '';
    if (!mapReady || marker || q.length < 3) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await geocodingApi.searchAddress(q, 1);
        const hit = res.data.data?.[0];
        if (!cancelled && hit) {
          mapRef.current?.inject(`window.focusArea(${hit.latitude},${hit.longitude},13);`);
        }
      } catch { /* best effort — the user can still pan */ }
    }, 600);
    return () => { cancelled = true; clearTimeout(id); };
  }, [focusQuery, mapReady, marker]);

  const hasInitial  = initialRef.current.latitude != null && initialRef.current.longitude != null;
  const initialZoom = hasInitial ? 15 : 6;
  const centerLat = initialRef.current.latitude ?? 46.6034; // France centroid fallback
  const centerLng = initialRef.current.longitude ?? 1.8883;

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
        <View style={[styles.preview, styles.previewConfirmed]} accessibilityLiveRegion="polite">
          <MapPin size={16} color={colors.success} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
          <View style={styles.previewLeft}>
            {loadingGeo ? (
              <View style={styles.resolvingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.addrText}>{t('address_resolving')}</Text>
              </View>
            ) : (
              <>
                {address && <Text style={styles.addrMain} numberOfLines={2}>{address}</Text>}
                <Text style={styles.coords}>{marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</Text>
              </>
            )}
          </View>
          <View style={styles.confirmedBadge}>
            <Check size={12} color={colors.success} strokeWidth={2.5} />
            <Text style={styles.confirmedText}>{t('position_saved')}</Text>
          </View>
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
  previewConfirmed: { borderColor: colors.successBorder, backgroundColor: colors.successSurface },
  resolvingRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  addrMain:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  previewLeft:      { flex: 1, gap: 3 },
  coords:           { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textPrimary },
  addrText:         { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: colors.success, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexShrink: 0 },
  confirmedText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.success },
});
