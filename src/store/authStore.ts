import { create } from 'zustand';
import { tokenStorage } from '@services/tokenStorage';
import { fcmService }    from '@services/fcmService';
import { socketService } from '@services/socketService';
import type { User, AuthTokens } from '@models/index';

let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch { /* ok */ }

const STORAGE_KEY = '@securbook:client:auth';

interface AuthState {
  user:        User | null;
  accessToken: string | null;
  isLoggedIn:  boolean;
  isLoading:   boolean;

  setUser:    (user: User) => void;
  setLoading: (v: boolean) => void;
  hydrate:    (user: User, tokens: AuthTokens) => void;
  rehydrate:  () => Promise<void>;
  logout:     () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:        null,
  accessToken: null,
  isLoggedIn:  false,
  isLoading:   true,

  setUser:    (user) => set({ user }),
  setLoading: (v)    => set({ isLoading: v }),

  hydrate: (user, tokens) => {
    tokenStorage.setTokens(tokens);
    set({ user, accessToken: tokens.accessToken, isLoggedIn: true, isLoading: false });
    AsyncStorage?.setItem(STORAGE_KEY, JSON.stringify({ user })).catch(() => {});

    // Connexion WebSocket + enregistrement FCM après login
    socketService.connect(tokens.accessToken);
    fcmService.registerToken().catch(() => {});
  },

  rehydrate: async () => {
    set({ isLoading: true });
    try {
      const accessToken = tokenStorage.getAccessToken();
      if (!accessToken) { set({ isLoading: false }); return; }

      const raw = await AsyncStorage?.getItem(STORAGE_KEY);
      if (raw) {
        const { user } = JSON.parse(raw);
        if (user) {
          set({ user, accessToken, isLoggedIn: true });
          socketService.connect(accessToken);
          fcmService.registerToken().catch(() => {});
        }
      }
    } catch { /* ignore */ } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    socketService.disconnect();
    fcmService.unregisterToken().catch(() => {});
    tokenStorage.clearTokens();
    AsyncStorage?.removeItem(STORAGE_KEY).catch(() => {});
    set({ user: null, accessToken: null, isLoggedIn: false, isLoading: false });
  },
}));
