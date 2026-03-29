import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Global auth store using Zustand.
 * _hasHydrated: tracks when Zustand has finished reading from localStorage.
 * Until hydration is complete, we show a loading spinner.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) => {
        Cookies.set('auth_token', token, { expires: 7, sameSite: 'lax' });
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        Cookies.remove('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Called automatically by Zustand after localStorage is read
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Sync token from store back into cookie (handles page refresh)
        if (state?.token) {
          Cookies.set('auth_token', state.token, { expires: 7, sameSite: 'lax' });
        }
      },
    },
  ),
);
