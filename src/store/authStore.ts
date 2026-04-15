import { create }                     from 'zustand';
import { persist, createJSONStorage }  from 'zustand/middleware';
import axios                           from 'axios';
import { tokenStorage }                from '@services/tokenStorage';
import { fcmService }                  from '@services/fcmService';
import { socketService }               from '@services/socketService';
import { API_BASE_URL }                from '@constants/config';
import type { User, AuthTokens }       from '@models/index';

let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

// ── Raw axios (bypasses the 401 interceptor to avoid infinite loops) ──────────
const rawHttp = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 });

interface AuthState {
  user:        User | null;
  accessToken: string | null;
  isLoggedIn:  boolean;
  isLoading:   boolean;

  setUser:    (user: User)          => void;
  setLoading: (v: boolean)          => void;
  hydrate:    (user: User, tokens: AuthTokens) => void;
  rehydrate:  ()                    => Promise<void>;
  logout:     ()                    => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:        null,
      accessToken: null,
      isLoggedIn:  false,
      isLoading:   true,

      setUser:    (user) => set({ user }),
      setLoading: (v)    => set({ isLoading: v }),

      // ── Post-login hydration ──────────────────────────────────────────────
      hydrate: (user, tokens) => {
        tokenStorage.setTokens(tokens);
        set({ user, accessToken: tokens.accessToken, isLoggedIn: true, isLoading: false });
        socketService.connect(tokens.accessToken);
        fcmService.registerToken().catch(() => {});
      },

      // ── App startup: verify + refresh ────────────────────────────────────
      rehydrate: async () => {
        set({ isLoading: true });

        try {
          let accessToken = tokenStorage.getAccessToken();

          // 1. No token at all → show login
          if (!accessToken) {
            set({ user: null, isLoggedIn: false, isLoading: false });
            return;
          }

          // 2. Try to validate token by calling /users/me
          try {
            const { data } = await rawHttp.get('/users/me', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const user: User = data.data ?? data;
            set({ user, accessToken, isLoggedIn: true, isLoading: false });
            socketService.connect(accessToken);
            fcmService.registerToken().catch(() => {});
            return; // ✅ Session valid
          } catch (verifyErr: any) {

            // 3a. Network error (offline) → use cached user, optimistic
            if (!verifyErr?.response) {
              const cached = get().user;
              if (cached) {
                set({ accessToken, isLoggedIn: true, isLoading: false });
                socketService.connect(accessToken);
              } else {
                set({ user: null, isLoggedIn: false, isLoading: false });
              }
              return;
            }

            // 3b. 401 → access token expired → try refresh
            if (verifyErr.response?.status === 401) {
              try {
                const refreshToken = tokenStorage.getRefreshToken();
                if (!refreshToken) throw new Error('No refresh token');

                const { data: rData } = await rawHttp.post(
                  '/auth/refresh',
                  { refreshToken },
                  { headers: { Authorization: `Bearer ${refreshToken}` } },
                );
                const { accessToken: newAt, refreshToken: newRt } =
                  rData.data ?? rData;

                tokenStorage.setTokens({ accessToken: newAt, refreshToken: newRt });
                accessToken = newAt;

                // Fetch fresh user with the new token
                const { data: uData } = await rawHttp.get('/users/me', {
                  headers: { Authorization: `Bearer ${newAt}` },
                });
                const user: User = uData.data ?? uData;
                set({ user, accessToken: newAt, isLoggedIn: true, isLoading: false });
                socketService.connect(newAt);
                fcmService.registerToken().catch(() => {});
                return; // ✅ Session refreshed
              } catch {
                // Both tokens invalid (DB reset, session wiped, etc.) → force logout
                tokenStorage.clearTokens();
                set({ user: null, accessToken: null, isLoggedIn: false, isLoading: false });
                return;
              }
            }

            // 3c. Other server error (5xx, etc.) → optimistic with cached user
            const cached = get().user;
            set({ accessToken, isLoggedIn: !!cached, isLoading: false });
            if (cached) socketService.connect(accessToken);
          }
        } catch {
          set({ isLoading: false });
        }
      },

      // ── Logout ────────────────────────────────────────────────────────────
      logout: () => {
        socketService.disconnect();
        fcmService.unregisterToken().catch(() => {});
        tokenStorage.clearTokens();
        set({ user: null, accessToken: null, isLoggedIn: false, isLoading: false });
      },
    }),
    {
      name:    '@securbook:client:auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the user object — tokens live in tokenStorage
      partialize: (state) => ({ user: state.user }),
      // After persist restores user: don't change isLoading here —
      // rehydrate() is the single source of truth for isLoggedIn
      onRehydrateStorage: () => (_state) => { /* intentionally empty */ },
    },
  ),
);
