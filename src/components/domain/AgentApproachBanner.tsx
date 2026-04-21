/**
 * AgentApproachBanner — Uber-style "votre agent arrive" card.
 *
 * Shown in MissionDetailScreen and BookingDetailScreen when
 * booking.status === ASSIGNED (agent selected, not yet on-site).
 *
 * Features:
 *  • Mini Leaflet map with agent position (live via socket) + site marker
 *  • Distance label + animated ETA estimation
 *  • Agent avatar + name + rating
 *  • Pulsing "En route" badge
 *  • Tap → navigate to LiveTrackingScreen for full map
 *  • Fades in when first agent position is received
 */
import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { WebView }          from 'react-native-webview';
import { Navigation2, Star, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { Avatar }           from '@components/ui/Avatar';
import { socketService }    from '@services/socketService';
import { useAuthStore }     from '@store/authStore';
import { colors, palette }  from '@theme/colors';
import { spacing, radius }  from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AgentPosition } from '@services/socketService';

// ── Approach map HTML (built once, updated via inject) ────────────────────────
function buildApproachHTML(siteLat: number, siteLng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; background:#071e38; }
  .leaflet-control-attribution,.leaflet-control-zoom { display:none!important; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
  .agent-pulse { animation: pulse 1.5s ease-in-out infinite; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var SITE_LAT = ${siteLat}, SITE_LNG = ${siteLng};
  var map = L.map('map',{
    zoomControl:false, dragging:false, touchZoom:false,
    doubleClickZoom:false, scrollWheelZoom:false,
    boxZoom:false, keyboard:false, tap:false,
  }).setView([SITE_LAT, SITE_LNG], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:''}).addTo(map);

  // Site marker (gold pin)
  L.divIcon && L.marker([SITE_LAT,SITE_LNG],{icon:L.divIcon({
    className:'',
    html:'<div style="width:28px;height:28px;border-radius:50%;background:#bc933b;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5)">'
       + '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'#fff\\' stroke-width=\\'2.5\\'>'
       + '<path d=\\'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\\'></path>'
       + '<circle cx=\\'12\\' cy=\\'10\\' r=\\'3\\'></circle></svg></div>',
    iconSize:[28,28],iconAnchor:[14,28],
  })}).addTo(map);

  var agentMarker = null;
  var routeLine   = null;

  window.updateAgent = function(lat, lng) {
    var html = '<div class=\\'agent-pulse\\' style=\\'width:22px;height:22px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,.6)\\'></div>';
    var icon = L.divIcon({className:'',html:html,iconSize:[22,22],iconAnchor:[11,11]});

    if (!agentMarker) {
      agentMarker = L.marker([lat,lng],{icon:icon}).addTo(map);
    } else {
      agentMarker.setLatLng([lat,lng]);
      agentMarker.setIcon(icon);
    }

    // Dashed route line agent → site
    var pts = [[lat,lng],[SITE_LAT,SITE_LNG]];
    if (!routeLine) {
      routeLine = L.polyline(pts,{color:'#3b82f6',weight:2,dashArray:'6,5',opacity:.75}).addTo(map);
    } else {
      routeLine.setLatLngs(pts);
    }

    // Auto-fit bounds to show both markers
    map.fitBounds([[lat,lng],[SITE_LAT,SITE_LNG]],{padding:[28,28]});

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
    }
  };
})();
</script>
</body>
</html>`;
}

// ── Haversine (client-side distance) ──────────────────────────────────────────
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dLat/2)**2
    + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentInfo {
  id:           string;
  fullName:     string;
  avatarUrl?:   string | null;
  avgRating?:   number | null;
  isValidated?: boolean;
}

interface Props {
  missionId:  string;
  bookingId:  string;
  agent:      AgentInfo;
  siteLat:    number;
  siteLng:    number;
  onTrack:    () => void; // navigate to LiveTrackingScreen
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AgentApproachBanner: React.FC<Props> = ({
  missionId, bookingId, agent, siteLat, siteLng, onTrack,
}) => {
  const webRef    = useRef<any>(null);
  const jsReady   = useRef(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [agentPos,   setAgentPos]   = useState<AgentPosition | null>(null);
  const [distLabel,  setDistLabel]  = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  // Pulsing "En route" dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Socket — join mission room and listen for agent positions
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) socketService.connect(token);
    socketService.joinMission(missionId);

    const unsub = socketService.onAgentPosition((pos: AgentPosition) => {
      if (pos.missionId !== missionId && pos.bookingId !== bookingId) return;
      setAgentPos(pos);

      const km   = distanceKm(pos.latitude, pos.longitude, siteLat, siteLng);
      const mVal = Math.round(km * 1000);
      setDistLabel(mVal < 1000 ? `${mVal} m` : `${km.toFixed(1)} km`);

      // Update map if JS ready
      if (jsReady.current && webRef.current) {
        webRef.current.injectJavaScript(
          `(function(){ window.updateAgent(${pos.latitude},${pos.longitude}); })(); true;`
        );
      }

      // Fade in banner on first position
      if (!mapVisible) {
        setMapVisible(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    });

    return () => {
      unsub();
      socketService.leaveMission(missionId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, bookingId]);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') jsReady.current = true;
    } catch { /* ignore */ }
  }, []);

  const html = useMemo(
    () => buildApproachHTML(siteLat, siteLng),
    [siteLat, siteLng],
  );

  // Don't render until we have at least one position
  if (!mapVisible) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.routeBadge}>
          <Animated.View style={[styles.routeDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.routeText}>En route vers votre site</Text>
        </View>
        {distLabel && (
          <View style={styles.distBadge}>
            <Navigation2 size={11} color={colors.info} strokeWidth={2} />
            <Text style={styles.distText}>{distLabel}</Text>
          </View>
        )}
      </View>

      {/* ── Mini map ── */}
      <View style={styles.mapBox}>
        <WebView
          ref={webRef}
          source={{ html }}
          style={styles.map}
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
        />
      </View>

      {/* ── Agent info + CTA ── */}
      <View style={styles.agentRow}>
        <Avatar
          name={agent.fullName}
          avatarUrl={agent.avatarUrl ?? undefined}
          size={44}
        />
        <View style={styles.agentMeta}>
          <Text style={styles.agentName}>{agent.fullName}</Text>
          <View style={styles.agentSub}>
            {agent.isValidated && (
              <View style={styles.cnaps}>
                <ShieldCheck size={10} color={colors.success} strokeWidth={2} />
                <Text style={styles.cnapsText}>CNAPS</Text>
              </View>
            )}
            {agent.avgRating != null && (
              <View style={styles.rating}>
                <Star size={10} color={colors.warning} strokeWidth={2} />
                <Text style={styles.ratingText}>{agent.avgRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.trackBtn} onPress={onTrack} activeOpacity={0.82}>
          <Text style={styles.trackBtnText}>Suivre</Text>
          <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius:    radius.xl,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.info + '40',
    backgroundColor: colors.backgroundElevated,
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
  },
  routeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.info,
  },
  routeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.info,
  },
  distBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1],
    backgroundColor:   colors.infoSurface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1],
    borderWidth:       1,
    borderColor:       colors.info + '30',
  },
  distText: {
    fontFamily: fontFamily.monoMedium,
    fontSize:   fontSize.xs,
    color:      colors.info,
  },

  // Map
  mapBox: {
    height: 140,
  },
  map: {
    flex: 1,
    backgroundColor: '#071e38',
  },

  // Agent row
  agentRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[3],
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
  agentMeta:  { flex: 1, gap: 3 },
  agentName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  agentSub: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cnaps: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.successSurface,
    borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2,
  },
  cnapsText: { fontFamily: fontFamily.bodyMedium, fontSize: 9, color: colors.success },
  rating:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.warning },

  trackBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1],
    backgroundColor:   colors.info,
    borderRadius:      radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
  },
  trackBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.xs,
    color:      '#fff',
  },
});
