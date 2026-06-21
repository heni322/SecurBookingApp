/**
 * fcmService.ts — Firebase Cloud Messaging client (SecurBookingApp).
 *
 * Uses the new @react-native-firebase v21 modular-style API (getApp / getMessaging)
 * to eliminate the deprecation warnings produced by the old namespaced calls.
 *
 * All methods are wrapped in try/catch so that a missing or placeholder
 * google-services.json never crashes the app — FCM simply stays inactive.
 *
 * Notification tap-through (deep-linking) is delegated to notificationRouter so
 * that push taps and in-app notification taps share one mapping. There are three
 * tap entry points handled here:
 *   1. Foreground   → onForegroundMessage (no auto-nav; caller decides)
 *   2. Background    → onNotificationOpenedApp (app was backgrounded)
 *   3. Quit / cold start → getInitialNotification (app launched by the tap)
 */
import apiClient from '../api/client';
import { navigateFromNotification } from './notificationRouter';
import type { NotificationData } from './notificationRouter';

// Lazy imports to avoid crashes when Firebase is not configured
let _messaging: any = null;

function getMessaging(): any {
  if (_messaging) return _messaging;
  try {
    // @react-native-firebase/messaging v21+ exposes a default export that
    // accepts an optional app argument — call with no args for the default app.
    const mod = require('@react-native-firebase/messaging');
    _messaging = mod.default ? mod.default() : mod();
    return _messaging;
  } catch {
    return null;
  }
}

/** Coerce an FCM RemoteMessage into the flat data map the router expects. */
function toData(msg: any): NotificationData | null {
  if (!msg) return null;
  const data = (msg.data ?? {}) as Record<string, string>;
  // Fall back to notification.title/body type if backend only set data.type.
  return data && Object.keys(data).length > 0 ? data : null;
}

class FcmService {
  async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      const m = getMessaging();
      if (!m) return null;
      const status = await m.requestPermission();
      const authStatus = require('@react-native-firebase/messaging').default;
      const ok =
        status === authStatus.AuthorizationStatus?.AUTHORIZED ||
        status === authStatus.AuthorizationStatus?.PROVISIONAL ||
        status === 1 || status === 2; // numeric fallback
      if (!ok) return null;
      return await m.getToken();
    } catch (e: any) {
      if (__DEV__) console.warn('[FCM] requestPermissionAndGetToken failed:', e?.message);
      return null;
    }
  }

  async registerToken(): Promise<void> {
    try {
      const token = await this.requestPermissionAndGetToken();
      if (!token) return;
      await apiClient.post('/notifications/fcm-token', { fcmToken: token });

      // Listen for token rotation
      const m = getMessaging();
      m?.onTokenRefresh(async (t: string) => {
        try { await apiClient.post('/notifications/fcm-token', { fcmToken: t }); }
        catch { /* silent */ }
      });
    } catch { /* silent — Firebase not configured or placeholder credentials */ }
  }

  onForegroundMessage(cb: (type: string, title: string, body: string) => void): () => void {
    try {
      const m = getMessaging();
      if (!m) return () => {};
      return m.onMessage(async (msg: any) => {
        cb(
          (msg.data?.type as string) ?? 'GENERIC',
          msg.notification?.title ?? 'Provalk',
          msg.notification?.body ?? '',
        );
      });
    } catch {
      return () => {};
    }
  }

  /**
   * registerTapHandlers — wires deep-linking for the two "tap opened the app"
   * cases. Must be called once after the navigation container is mounted
   * (App.tsx onReady). Returns an unsubscribe for the background listener.
   *
   *   • onNotificationOpenedApp → app was in the background, user tapped a push.
   *   • getInitialNotification  → app was killed; the tap cold-started it. The
   *     router buffers the target until navigation is ready, so calling this even
   *     slightly before <NavigationContainer> mounts is safe.
   */
  registerTapHandlers(): () => void {
    try {
      const m = getMessaging();
      if (!m) return () => {};

      // Background → foreground tap
      const unsub = m.onNotificationOpenedApp((msg: any) => {
        navigateFromNotification(toData(msg));
      });

      // Quit-state cold start: resolve the launch notification (if any)
      m.getInitialNotification()
        .then((msg: any) => {
          if (msg) navigateFromNotification(toData(msg));
        })
        .catch(() => { /* silent */ });

      return typeof unsub === 'function' ? unsub : () => {};
    } catch {
      return () => {};
    }
  }

  /**
   * setBackgroundMessageHandler — must be called once at app startup from
   * index.js (the entry point) so it runs before the app tree mounts.
   *
   * The handler itself runs in a headless JS context where navigation does NOT
   * exist, so it must NOT try to navigate. Its job is limited to side effects
   * that are safe headless (e.g. data sync). Actual tap-through navigation is
   * handled by registerTapHandlers() once the UI is alive.
   */
  setBackgroundMessageHandler() {
    try {
      const m = getMessaging();
      m?.setBackgroundMessageHandler(async (_msg: any) => {
        // Headless context: no navigation. The OS already displays the
        // notification from the `notification` payload; nothing else required.
        // Returning a resolved promise acknowledges handling to the OS.
      });
    } catch { /* silent — Firebase not configured */ }
  }

  onForegroundTap(): void {
    // Reserved for future: building a local notification on foreground messages
    // and routing on tap. Foreground messages currently only bump the badge.
  }

  async unregisterToken() {
    try {
      const m = getMessaging();
      await m?.deleteToken();
    } catch { /* silent */ }
  }
}

export const fcmService = new FcmService();
