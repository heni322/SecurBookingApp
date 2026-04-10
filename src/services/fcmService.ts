import messaging from '@react-native-firebase/messaging';
import apiClient from '../api/client';

class FcmService {
  async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      const status = await messaging().requestPermission();
      const ok =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      if (!ok) return null;
      return await messaging().getToken();
    } catch { return null; }
  }

  async registerToken(): Promise<void> {
    try {
      const token = await this.requestPermissionAndGetToken();
      if (!token) return;
      await apiClient.post('/notifications/fcm-token', { fcmToken: token });
      messaging().onTokenRefresh(async (t) => {
        try { await apiClient.post('/notifications/fcm-token', { fcmToken: t }); } catch { /* silent */ }
      });
    } catch { /* silent — Firebase not configured */ }
  }

  onForegroundMessage(cb: (type: string, title: string, body: string) => void) {
    try {
      return messaging().onMessage(async (msg) => {
        cb(
          (msg.data?.type as string) ?? 'GENERIC',
          msg.notification?.title ?? 'SecurBook',
          msg.notification?.body ?? '',
        );
      });
    } catch {
      return () => {}; // no-op unsubscribe
    }
  }

  setBackgroundMessageHandler() {
    try {
      messaging().setBackgroundMessageHandler(async () => {});
    } catch { /* silent — Firebase not configured */ }
  }

  async unregisterToken() {
    try { await messaging().deleteToken(); } catch { /* silent */ }
  }
}

export const fcmService = new FcmService();