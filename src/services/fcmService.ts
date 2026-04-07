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
    const token = await this.requestPermissionAndGetToken();
    if (!token) return;
    try {
      await apiClient.post('/notifications/fcm-token', { fcmToken: token });
    } catch { /* silent */ }
    messaging().onTokenRefresh(async (t) => {
      try { await apiClient.post('/notifications/fcm-token', { fcmToken: t }); } catch { /* silent */ }
    });
  }

  onForegroundMessage(cb: (type: string, title: string, body: string) => void) {
    return messaging().onMessage(async (msg) => {
      cb(
        (msg.data?.type as string) ?? 'GENERIC',
        msg.notification?.title ?? 'SecurBook',
        msg.notification?.body ?? '',
      );
    });
  }

  setBackgroundMessageHandler() {
    messaging().setBackgroundMessageHandler(async () => {});
  }

  async unregisterToken() {
    try { await messaging().deleteToken(); } catch { /* silent */ }
  }
}

export const fcmService = new FcmService();
