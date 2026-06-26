/**
 * AgentApproachBanner — Uber-style "votre agent arrive" card.
 *
 * Shown in MissionDetailScreen and BookingDetailScreen when
 * booking.status === ASSIGNED (agent selected, not yet on-site).
 *
 * Features:
 *  • Mini Leaflet map with agent position (live via socket) + site marker
 *  • Distance label + ETA estimation (FIX H4)
 *  • Agent avatar + name + rating
 *  • Pulsing "En route" badge
 *  • Tap → navigate to LiveTrackingScreen for full map
 *  • Fades in when first agent position is received
 *
 * FIX HISTORY:
 *  v2 — [FIX H5] Hardcoded French strings ("En route vers votre site",
 *        "Suivre") replaced with t('tracking:*'). "CNAPS" kept as-is (proper
 *        noun / French regulator acronym, identical across locales).
 *     — [FIX H4] Added a speed-aware ETA. A short rolling history of recent
 *        fixes yields an approach speed toward the site; ETA = remaining
 *        distance / speed. Falls back to the payload `speed` (m/s) when the
 *        history is too short, and hides the ETA entirely when the agent is
 *        effectively stationary (speed below MIN_APPROACH_MPS).
 *  v3 — [FIX H3] Mini map rebuilt on the shared <LeafletMapView> shell:
 *        Leaflet's JS/CSS are inlined from the bundle (no unpkg CDN fetch),
 *        and this map gains real loading/error/retry UI for the first time
 *        — previously a stalled CDN fetch here left a permanently blank box
 *        with zero explanation, on the highest-visibility tracking surface
 *        in the app (this banner is what most clients see first).
 */
import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
} from 'react-native';
import { Navigation2, Star, ShieldCheck, ChevronRight, Clock } from 'lucide-react-native';
import { useTranslation }   from '@i18n';
import { Avatar }           from '@components/ui/Avatar';
import { LeafletMapView, type LeafletMapViewHandle } from '@components/ui/LeafletMapView';
import { socketService }    from '@services/socketService';
import { useAuthStore }     from '@store/authStore';
import { config }           from '@config';
import { colors, palette }  from '@theme/colors';
import { spacing, radius }  from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AgentPosition } from '@services/socketService';

// ── Approach map body script (runs once Leaflet + map are ready) ──────────────
function buildApproachBodyScript(siteLat: number, siteLng: number, tileUrl: string): string {
  return `
  var SITE_LAT = ${siteLat}, SITE_LNG = ${siteLng};

  L.tileLayer('${tileUrl}',{maxZoom:19,attribution:''}).addTo(map);

  // Site marker (gold pin)
  L.marker([SITE_LAT,SITE_LNG],{icon:L.divIcon({
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
    var html = '<div class="agent-pulse" style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,.6)"></div>';
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
      routeLine = L.polyline(pts,{color:'#60a5fa',weight:2,dashArray:'6,5',opacity:.75}).addTo(map);
    } else {
      routeLine.setLatLngs(pts);
    }

    // Auto-fit bounds to show both markers
    map.fitBounds([[lat,lng],[SITE_LAT,SITE_LNG]],{padding:[28,28]});
  };

  signalReady();
  `;
}

const APPROACH_EXTRA_STYLE = `
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
  .agent-pulse { animation: pulse 1.5s ease-in-out infinite; }
`;

// ── Haversine (client-side distance) ──────────────────────────────────────────
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dLat/2)**2
    + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── ETA tuning (FIX H4) ───────────────────────────────────────────────────────
/** Below this approach speed the agent is treated as stationary → no ETA. */
const MIN_APPROACH_MPS = 0.5;          // ~1.8 km/h
/** Cap the ETA we'll display; beyond this it's not useful. */
const MAX_ETA_MIN      = 180;
/** How many recent fixes to keep for the rolling speed estimate. */
const ETA_HISTORY      = 5;

interface FixSample { lat: number; lng: number; t: number; }

/**
 * Estimate ETA in whole minutes from a short history of fixes toward the site,
 * or null when it can't be reliably computed (too few fixes / stationary).
 */
function estimateEtaMinutes(
  history: FixSample[],
  siteLat: number,
  siteLng: number,
  fallbackMps?: number,
): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1];
  const remainingM = distanceKm(latest.lat, latest.lng, siteLat, siteLng) * 1000;

  let mps: number | null = null;

  if (history.length >= 2) {
    // Rate of decrease of distance-to-site across the window = approach speed.
    const first = history[0];
    const dStart = distanceKm(first.lat, first.lng, siteLat, siteLng) * 1000;
    const closedM = dStart - remainingM;       // metres closed toward the site
    const dtSec = (latest.t - first.t) / 1000;
    if (dtSec > 0 && closedM > 0) {
      mps = closedM / dtSec;
    }
  }

  // Fall back to the device-reported instantaneous speed if we couldn't derive
  // an approach rate (e.g. agent moved laterally then turned toward the site).
  if (mps === null && typeof fallbackMps === 'number' && isFinite(fallbackMps)) {
    mps = fallbackMps;
  }

  if (mps === null || mps < MIN_APPROACH_MPS) return null;

  const etaMin = Math.round(remainingM / mps / 60);
  if (etaMin <= 0) return 0;
  if (etaMin > MAX_ETA_MIN) return null;
  return etaMin;
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
  const { t }     = useTranslation('tracking');
  const mapRef    = useRef<LeafletMapViewHandle>(null);
  const mapReady  = useRef(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Rolling fix history for the ETA estimate (FIX H4).
  const fixHistory = useRef<FixSample[]>([]);
  // Latest position, replayed into the map once it (re)signals ready —
  // needed because [FIX H3]'s retry/remount can happen after positions
  // have already started arriving.
  const lastPos = useRef<AgentPosition | null>(null);

  const [, setAgentPos] = useState<AgentPosition | null>(null);
  const [distLabel,  setDistLabel]  = useState<string | null>(null);
  const [etaMin,     setEtaMin]     = useState<number | null>(null);
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
      lastPos.current = pos;

      const km   = distanceKm(pos.latitude, pos.longitude, siteLat, siteLng);
      const mVal = Math.round(km * 1000);
      setDistLabel(mVal < 1000 ? `${mVal} m` : `${km.toFixed(1)} km`);

      // ── ETA (FIX H4) ──────────────────────────────────────────────────
      const hist = fixHistory.current;
      hist.push({ lat: pos.latitude, lng: pos.longitude, t: pos.timestamp || Date.now() });
      if (hist.length > ETA_HISTORY) hist.shift();
      setEtaMin(estimateEtaMinutes(hist, siteLat, siteLng, pos.speed));

      // Update map if ready
      if (mapReady.current) {
        mapRef.current?.inject(`window.updateAgent(${pos.latitude},${pos.longitude});`);
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

  const handleMapReady = useCallback(() => {
    mapReady.current = true;
    // [FIX H3] Replay the latest known position immediately — covers both
    // the normal first-load case and the retry-after-error case, where
    // positions may have kept arriving (and been dropped, since mapReady
    // was false) while the map was down.
    if (lastPos.current) {
      mapRef.current?.inject(
        `window.updateAgent(${lastPos.current.latitude},${lastPos.current.longitude});`,
      );
    }
  }, []);

  const handleMapError = useCallback(() => {
    mapReady.current = false;
  }, []);

  const tileUrl = config.maps.tileUrlTemplate;

  const bodyScript = useMemo(
    () => buildApproachBodyScript(siteLat, siteLng, tileUrl),
    [siteLat, siteLng, tileUrl],
  );

  // ── ETA display string ────────────────────────────────────────────────────
  const etaLabel = useMemo(() => {
    if (etaMin === null) return null;
    if (etaMin <= 0) return t('eta_arriving');
    return t('eta_label', { minutes: etaMin });
  }, [etaMin, t]);

  // Don't render until we have at least one position
  if (!mapVisible) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.routeBadge}>
          <Animated.View style={[styles.routeDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.routeText}>{t('en_route')}</Text>
        </View>
        <View style={styles.headerRight}>
          {etaLabel && (
            <View style={styles.etaBadge}>
              <Clock size={11} color={colors.success} strokeWidth={2} />
              <Text style={styles.etaText}>{etaLabel}</Text>
            </View>
          )}
          {distLabel && (
            <View style={styles.distBadge}>
              <Navigation2 size={11} color={colors.info} strokeWidth={2} />
              <Text style={styles.distText}>{distLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Mini map ── */}
      <View style={styles.mapBox}>
        <LeafletMapView
          ref={mapRef}
          centerLat={siteLat}
          centerLng={siteLng}
          initialZoom={14}
          zoomControl={false}
          dragging={false}
          bodyScript={bodyScript}
          extraStyle={APPROACH_EXTRA_STYLE}
          onReady={handleMapReady}
          onMapError={handleMapError}
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
          <Text style={styles.trackBtnText}>{t('track_btn')}</Text>
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
    backgroundColor: colors.infoSurface,
  },
  routeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.info,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
  },
  etaBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1],
    backgroundColor:   colors.successSurface,
    borderRadius:      radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1],
    borderWidth:       1,
    borderColor:       colors.success + '30',
  },
  etaText: {
    fontFamily: fontFamily.monoMedium,
    fontSize:   fontSize.xs,
    color:      colors.success,
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
    backgroundColor:   colors.infoSurface,
    borderRadius:      radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
  },
  trackBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.xs,
    color:      palette.white,
  },
});
