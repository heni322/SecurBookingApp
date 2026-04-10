/**
 * @format
 * index.js - Client SecurBook entry point.
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Background / Quit state FCM handler — wrapped in try/catch to prevent
// crashes when google-services.json is a placeholder or Firebase isn't configured.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM Background]', remoteMessage.notification?.title);
  });
} catch (e) {
  console.warn('[FCM] Background handler not registered:', e?.message);
}

AppRegistry.registerComponent(appName, () => App);