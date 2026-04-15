/**
 * notificationsStore.ts — unread notification counter with persistence.
 */
import { create }        from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

interface NotificationsState {
  unreadCount:    number;
  setUnreadCount: (n: number) => void;
  increment:      () => void;
  decrement:      () => void;
  reset:          () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      unreadCount:    0,
      setUnreadCount: (n) => set({ unreadCount: n }),
      increment:      () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
      decrement:      () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
      reset:          () => set({ unreadCount: 0 }),
    }),
    {
      name:    '@securbook:notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    },
  ),
);
