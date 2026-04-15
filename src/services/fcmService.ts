/**
 * fcmService.ts — Firebase Cloud Messaging client (SecurBookingApp).
 *
 * Uses the new @react-native-firebase v21 modular-style API (getApp / getMessaging)
 * to eliminate the deprecation warnings produced by the old namespaced calls.
 *
 * All methods are wrapped in try/catch so that a missing or placeholder
 * google-services.json never crashes the app — FCM simply stays inactive.
 */
import apiClient from '../api/client';

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
          msg.notification?.title ?? 'SecurBook',
          msg.notification?.body ?? '',
        );
      });
    } catch {
      return () => {};
    }
  }

  /**
   * setBackgroundMessageHandler — must be called once at app startup.
   * Called ONLY from index.js (the entry point) so it runs before the app
   * tree mounts. App.tsx no longer calls this to avoid the double registration
   * warning from @react-native-firebase.
   */
  setBackgroundMessageHandler() {
    try {
      const m = getMessaging();
      m?.setBackgroundMessageHandler(async () => {});
    } catch { /* silent — Firebase not configured */ }
  }

  async unregisterToken() {
    try {
      const m = getMessaging();
      await m?.deleteToken();
    } catch { /* silent */ }
  }
}

export const fcmService = new FcmService();
