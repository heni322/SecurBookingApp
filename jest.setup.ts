/**
 * jest.setup.ts — s'exécute une fois avant chaque fichier de test.
 *
 * AUDIT 2026-08 (constat A-17). Ce fichier n'existait pas : l'application
 * client comptait 0 test sur 221 fichiers, et `jest --passWithNoTests` rendait
 * l'absence invisible en CI. Le `moduleNameMapper` ne couvrait pas non plus les
 * alias nus (`@i18n`, `@models`, `@utils`…), donc le premier test écrit aurait
 * échoué à la résolution — le harnais n'avait jamais été exercé.
 *
 * Périmètre volontairement minimal : les modules natifs sans équivalent JS.
 * Calqué sur AgentSecurBookApp/jest.setup.ts, qui fait tourner 454 tests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── AsyncStorage ────────────────────────────────────────────────────────────
// Le mock fourni par le paquet est plus proche de la sémantique réelle qu'un
// mock maison (gestion des clés multiples, erreurs incluses).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ── react-native-keychain ───────────────────────────────────────────────────
// Implémentation en mémoire : tokenStorage l'appelle transitivement.
jest.mock('react-native-keychain', () => {
  const store = new Map<string, { username: string; password: string }>();
  return {
    ACCESSIBLE: {
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    },
    SECURITY_LEVEL: { SECURE_HARDWARE: 'SECURE_HARDWARE' },
    setGenericPassword: jest.fn(async (username: string, password: string, opts: any) => {
      store.set(opts?.service ?? 'default', { username, password });
      return true;
    }),
    getGenericPassword: jest.fn(async (opts: any) => {
      const v = store.get(opts?.service ?? 'default');
      return v ? { username: v.username, password: v.password, service: opts?.service } : false;
    }),
    resetGenericPassword: jest.fn(async (opts: any) => {
      store.delete(opts?.service ?? 'default');
      return true;
    }),
  };
});

// ── @stripe/stripe-react-native ───────────────────────────────────
// Le paquet instancie un `new NativeEventEmitter()` au chargement du module.
// Sous Jest le module natif est absent, l'invariant lève, et TOUT fichier qui
// importe App.tsx devient inexécutable — c'est ce qui bloquait App.test.tsx.
jest.mock('@stripe/stripe-react-native', () => ({
  __esModule: true,
  StripeProvider: ({ children }: any) => children,
  useStripe: () => ({
    initPaymentSheet: jest.fn(async () => ({})),
    presentPaymentSheet: jest.fn(async () => ({})),
    confirmPayment: jest.fn(async () => ({})),
  }),
  useConfirmPayment: () => ({ confirmPayment: jest.fn(async () => ({})) }),
  initStripe: jest.fn(async () => undefined),
}));

// ── Géolocalisation ────────────────────────────────────────────
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    requestAuthorization: jest.fn(),
    getCurrentPosition: jest.fn((success: any) =>
      success({
        coords: { latitude: 48.8566, longitude: 2.3522, accuracy: 10 },
        timestamp: Date.now(),
      }),
    ),
    watchPosition: jest.fn(() => 1),
    clearWatch: jest.fn(),
    stopObserving: jest.fn(),
  },
}));

// ── react-native-permissions ───────────────────────────────────
// TurboModule 'RNPermissions' introuvable sous Jest. On accorde tout par
// défaut : les tests qui vérifient un refus de permission doivent surcharger
// explicitement via jest.requireMock(), pour que l'intention soit lisible.
jest.mock('react-native-permissions', () => ({
  __esModule: true,
  PERMISSIONS: {
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
      CAMERA: 'ios.permission.CAMERA',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    },
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_BACKGROUND_LOCATION: 'android.permission.ACCESS_BACKGROUND_LOCATION',
      CAMERA: 'android.permission.CAMERA',
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
  },
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
  checkMultiple: jest.fn(async () => ({})),
  requestMultiple: jest.fn(async () => ({})),
  openSettings: jest.fn(async () => undefined),
}));

// ── react-native-webview ──────────────────────────────────────
// Utilisé pour la carte Leaflet (LiveTracking). Composant natif sans rendu JS.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const MockWebView = React.forwardRef((props: any, ref: any) =>
    React.createElement('WebView', { ...props, ref }),
  );
  MockWebView.displayName = 'WebView';
  return { __esModule: true, WebView: MockWebView, default: MockWebView };
});

// ── @shopify/flash-list ───────────────────────────────────────
// Repli sur la FlatList RN : même contrat de props, rendu JS pur.
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { FlatList } = require('react-native');
  const MockFlashList = React.forwardRef((props: any, ref: any) =>
    React.createElement(FlatList, { ...props, ref }),
  );
  MockFlashList.displayName = 'FlashList';
  return { __esModule: true, FlashList: MockFlashList, default: MockFlashList };
});

// ── Firebase (app + messaging) ───────────────────────────────────
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: { apps: [], app: jest.fn(() => ({})) },
}));

jest.mock('@react-native-firebase/messaging', () => {
  const messaging: any = () => ({
    requestPermission: jest.fn(async () => 1),
    hasPermission: jest.fn(async () => 1),
    getToken: jest.fn(async () => 'fcm-test-token'),
    deleteToken: jest.fn(async () => undefined),
    onMessage: jest.fn(() => () => {}),
    onTokenRefresh: jest.fn(() => () => {}),
    onNotificationOpenedApp: jest.fn(() => () => {}),
    getInitialNotification: jest.fn(async () => null),
    setBackgroundMessageHandler: jest.fn(),
    subscribeToTopic: jest.fn(async () => undefined),
    unsubscribeFromTopic: jest.fn(async () => undefined),
  });
  messaging.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };
  return { __esModule: true, default: messaging };
});

// ── socket.io-client ──────────────────────────────────────────
// Socket inerte : aucun test ne doit ouvrir de connexion réseau.
jest.mock('socket.io-client', () => {
  const socket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    connected: false,
    id: 'test-socket',
  };
  return { __esModule: true, io: jest.fn(() => socket), default: jest.fn(() => socket) };
});

// ── lucide-react-native ───────────────────────────────────────
// Chaque icône est un composant SVG ; un Proxy évite d'en énumérer 300.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_t, name: string) => {
        if (name === '__esModule') return true;
        const Icon = (props: any) => React.createElement('Icon', { ...props, name });
        Icon.displayName = String(name);
        return Icon;
      },
    },
  );
});

// ── Redimensionnement d'image / sélecteur de documents ────────────────────
jest.mock('@bam.tech/react-native-image-resizer', () => ({
  __esModule: true,
  default: {
    createResizedImage: jest.fn(async () => ({
      uri: 'file:///tmp/resized.jpg',
      name: 'resized.jpg',
      size: 1024,
    })),
  },
}));

jest.mock('@react-native-documents/picker', () => ({
  __esModule: true,
  pick: jest.fn(async () => []),
  types: { pdf: 'application/pdf', images: 'image/*', allFiles: '*/*' },
  isCancel: jest.fn(() => false),
}));

// ── @react-native-clipboard/clipboard ──────────────────────────────
jest.mock('@react-native-clipboard/clipboard', () => {
  let buffer = '';
  return {
    __esModule: true,
    default: {
      setString: (s: string) => {
        buffer = String(s ?? '');
      },
      getString: async () => buffer,
      hasString: async () => buffer.length > 0,
      addListener: () => ({ remove: () => {} }),
      removeAllListeners: () => {},
    },
  };
});

// ── react-native-image-picker ─────────────────────────────────
// Réponse par défaut : annulation. Un test qui attend une sélection doit la
// simuler explicitement — sinon on ferait passer un flux d'upload qui ne
// s'est jamais produit.
jest.mock('react-native-image-picker', () => ({
  __esModule: true,
  launchImageLibrary: jest.fn(async () => ({ didCancel: true, assets: [] })),
  launchCamera: jest.fn(async () => ({ didCancel: true, assets: [] })),
}));

// ── Haptics ─────────────────────────────────────────────────────────────────
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  trigger: jest.fn(),
}));

// Bruit de fond : les avertissements RN inondent la sortie CI sans rien
// apprendre. Les erreurs restent visibles.
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const first = String(args[0] ?? '');
  if (first.includes('deprecated') || first.includes('NativeEventEmitter')) return;
  originalWarn(...args);
};

// @sentry/react-native needs its native module: replaced in every test.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
