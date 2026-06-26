/**
 * notificationRouter.ts — single source of truth for "notification → screen".
 *
 * Both in-app notification taps (NotificationsScreen) and push-notification
 * taps (FCM, foreground/background/quit) must land on the SAME screen for a
 * given notification type. To guarantee that, the mapping lives here once and
 * is consumed by:
 *   • NotificationsScreen  → resolveNavAction(notif)        (in-app list tap)
 *   • App.tsx / fcmService → navigateFromNotification(data) (push tap)
 *
 * Push payloads (FCM `data`) are always flat string maps, whereas the in-app
 * notification carries a typed `metadata` object. NotificationsScreen normalises
 * the in-app shape into the same flat map and delegates here, so there is no
 * duplicated switch.
 */
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '@services/navigationRef';

/** Flat string map exactly as delivered in an FCM `data` payload. */
export type NotificationData = Record<string, string | undefined> & {
  type?: string;
};

type NavAction = ReturnType<typeof CommonActions.navigate>;

const toMissions = (screen: string, params?: Record<string, unknown>): NavAction =>
  CommonActions.navigate('Main', {
    screen: 'Missions',
    params: { screen, params },
  });

const toProfile = (screen: string, params?: Record<string, unknown>): NavAction =>
  CommonActions.navigate('Main', {
    screen: 'Profile',
    params: { screen, params },
  });

const toTab = (tab: string): NavAction =>
  CommonActions.navigate('Main', { screen: tab });

/**
 * Parse a coordinate string from an FCM payload into a valid lat/lng pair, or
 * null when either value is absent / non-finite / structurally out of range.
 *
 * [FIX C3] The previous code used `parseFloat(data.siteLat ?? '0')`, which
 * silently defaulted a missing coordinate to 0. LiveTrackingScreen then centred
 * the map on 0°N 0°E (Gulf of Guinea) and reported a permanent multi-thousand-km
 * "out of zone" breach. We now treat missing/invalid coordinates as "no coords"
 * and route to MissionDetail instead of opening a broken tracking map.
 */
function parseCoords(
  latStr: string | undefined,
  lngStr: string | undefined,
): { lat: number; lng: number } | null {
  if (latStr == null || lngStr == null) return null;
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Pure mapping: notification type + flat data → navigation action (or null).
 *
 * NOTE: actions are wrapped at the ROOT level ('Main' → tab → stack screen) so
 * they work from a cold start where only the root navigator exists. The in-app
 * list already sits inside 'Main', but dispatching a root-qualified navigate is
 * idempotent there too.
 */
export function resolveNotificationAction(data: NotificationData): NavAction | null {
  const type = data.type ?? '';
  const missionId = data.missionId;
  const bookingId = data.bookingId;

  switch (type) {
    case 'MISSION_AVAILABLE':
    case 'MISSION_PUBLISHED':
    case 'BOOKING_ASSIGNED':
      return missionId
        ? toMissions('MissionDetail', { missionId })
        : toMissions('MissionList');

    case 'BOOKING_CHECKIN':
    case 'BOOKING_CHECKOUT':
    case 'AGENT_CHECKED_IN':
    case 'AGENT_CHECKED_OUT':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_FORCE_CHECKOUT':
      if (bookingId) return toMissions('BookingDetail', { bookingId });
      if (missionId) return toMissions('MissionDetail', { missionId });
      return toMissions('MissionList');

    case 'AGENT_LOCATION_UPDATE': {
      // [FIX C3] Only open LiveTracking when we have a mission, a booking AND
      // valid site coordinates. Otherwise fall back to MissionDetail rather than
      // launching the tracking map with bogus (0,0) coordinates.
      const coords = parseCoords(data.siteLat, data.siteLng);
      if (missionId && bookingId && coords) {
        return toMissions('LiveTracking', {
          missionId,
          bookingId,
          agentName: data.agentName ?? 'Agent',
          missionAddress: data.missionAddress ?? '',
          siteLat: coords.lat,
          siteLng: coords.lng,
        });
      }
      if (missionId) return toMissions('MissionDetail', { missionId });
      return null;
    }

    case 'MISSION_REPORT_READY':
    case 'RATING_RECEIVED':
      return missionId
        ? toMissions('MissionDetail', { missionId })
        : toMissions('MissionList');

    case 'RATING_REQUESTED':
      if (bookingId) return toMissions('BookingDetail', { bookingId });
      return toMissions('MissionList');

    case 'INCIDENT_REPORTED':
      return missionId
        ? toMissions('Dispute', {
            missionId,
            bookingId,
            missionTitle: data.missionTitle ?? 'Mission',
          })
        : null;

    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_FAILED':
    case 'PAYMENT_PENDING':
    case 'PAYMENT_PROCESSING':
      return toProfile('PaymentHistory');

    case 'DOCUMENT_APPROVED':
    case 'DOCUMENT_REJECTED':
    case 'ACCOUNT_SUSPENDED':
    case 'ACCOUNT_ACTIVATED':
      return toProfile('ProfileMain');

    case 'GENERIC':
    case '':
      // No specific target — surface the notifications list.
      return toTab('Notifications');

    default:
      return toTab('Notifications');
  }
}

// ── Cold-start buffering ──────────────────────────────────────────────────────
// When the app is launched FROM a notification (quit state), the tap arrives
// before <NavigationContainer> is mounted. We stash the action and flush it once
// navigation reports ready (called from App.tsx onReady).
let pendingData: NotificationData | null = null;

/**
 * Dispatch navigation for a push notification. If navigation is not ready yet
 * (cold start), the data is buffered and replayed by flushPendingNotification().
 */
export function navigateFromNotification(data: NotificationData | null | undefined): void {
  if (!data) return;
  if (!navigationRef.isReady()) {
    pendingData = data;
    return;
  }
  const action = resolveNotificationAction(data);
  if (action) navigationRef.dispatch(action);
}

/** Called once from NavigationContainer onReady to replay a buffered deep-link. */
export function flushPendingNotification(): void {
  if (!pendingData) return;
  const data = pendingData;
  pendingData = null;
  const action = resolveNotificationAction(data);
  if (action) navigationRef.dispatch(action);
}
