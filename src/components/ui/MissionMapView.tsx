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
 *  v3 — Tile URL template sourced from @config.maps.tileUrlTemplate
 *  v4 — [FIX H5] Hardcoded French "Réessayer" replaced with i18n.t('common:retry').
 *  v5 — [FIX H3] Rebuilt on the shared <LeafletMapView> shell: Leaflet's JS/CSS
 *        are now inlined from the bundle (no unpkg CDN fetch at runtime), and
 *        the loading/error/retry chrome — previously duplicated in this file
 *        — is now the shared implementation. The read-only "mission zone"
 *        badge keeps its original behaviour (visible only once the map has
 *        actually rendered) via the shell's onReady callback.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { config } from '@config';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import i18n from '@i18n';
import { LeafletMapView } from './LeafletMapView';

interface Props {
  latitude:     number;
  longitude:    number;
  title?:       string;
  height?:      number;
  interactive?: boolean;
}

function buildBodyScript(
  lat: number,
  lng: number,
  title: string,
  tileUrl: string,
): string {
  const escapedTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `
  L.tileLayer('${tileUrl}', {
    maxZoom: 19, attribution: ''
  }).addTo(map);

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

  signalReady();
  `;
}

export const MissionMapView: React.FC<Props> = ({
  latitude,
  longitude,
  title       = '',
  height      = 220,
  interactive = false,
}) => {
  const tileUrl = config.maps.tileUrlTemplate;
  const [ready, setReady] = useState(false);

  const bodyScript = useMemo(
    () => buildBodyScript(latitude, longitude, title, tileUrl),
    [latitude, longitude, title, tileUrl],
  );

  const extraStyle = useMemo(
    () => `.leaflet-control-zoom { display:${interactive ? 'block' : 'none'} !important; }`,
    [interactive],
  );

  return (
    <View style={[styles.container, { height }]}>
      <LeafletMapView
        centerLat={latitude}
        centerLng={longitude}
        initialZoom={14}
        zoomControl={interactive}
        dragging={interactive}
        bodyScript={bodyScript}
        extraStyle={extraStyle}
        onReady={() => setReady(true)}
        onMapError={() => setReady(false)}
      />

      {/* Read-only badge — same condition as before the refactor: only once
          the map has actually finished rendering (status === 'ready'). */}
      {!interactive && ready && (
        <View style={styles.badge} pointerEvents="none">
          <MapPin size={10} color={colors.primary} strokeWidth={2} />
          <Text style={styles.badgeText}>{i18n.t('common:mission_zone')}</Text>
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
