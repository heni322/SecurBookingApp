/**
 * @format
 * index.js - Client SecurBook entry point.
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { fcmService } from './src/services/fcmService';

// Background / Quit-state FCM handler.
// Delegated to fcmService which uses the modern modular API and
// handles a missing/placeholder google-services.json gracefully.
fcmService.setBackgroundMessageHandler();

AppRegistry.registerComponent(appName, () => App);