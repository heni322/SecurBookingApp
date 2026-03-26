/**
 * authStore.ts — état d'authentification global (Zustand).
 */
import { create } from 'zustand';
import { tokenStorage } from '@services/tokenStorage';
import type { User, AuthTokens } from '@models/index';

interface AuthState {
  user:       User | null;
  isLoggedIn: boolean;
  isLoading:  boolean;

  setUser:    (user: User) => void;
  setLoading: (v: boolean) => void;
  logout:     () => void;
  hydrate:    (user: User, tokens: AuthTokens) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:       null,
  isLoggedIn: false,
  isLoading:  true,

  setUser:    (user) => set({ user }),
  setLoading: (v)    => set({ isLoading: v }),

  hydrate: (user, tokens) => {
    tokenStorage.setTokens(tokens);
    set({ user, isLoggedIn: true, isLoading: false });
  },

  logout: () => {
    tokenStorage.clearTokens();
    set({ user: null, isLoggedIn: false, isLoading: false });
    // Navigation vers Auth gérée par RootNavigator via isLoggedIn
  },
}));
