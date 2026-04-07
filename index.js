/**
 * @format
 * index.js — Client SecurBook entry point.
 */
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Background / Quit state FCM handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM Background]', remoteMessage.notification?.title);
});

AppRegistry.registerComponent(appName, () => App);
