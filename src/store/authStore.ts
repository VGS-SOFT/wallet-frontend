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
 * Global auth store using Zustand with localStorage persistence.
 *
 * Token storage strategy (single source of truth):
 * - localStorage (via Zustand persist): survives page refresh, readable by JS.
 * - Cookie (auth_token): readable by axios interceptor on every request.
 * Both are always kept in sync via setAuth and clearAuth.
 *
 * Hydration:
 * - _hasHydrated starts false. Pages must wait for it before checking auth.
 * - onRehydrateStorage fires after localStorage is read — sets _hasHydrated true.
 * - Also re-syncs cookie from persisted token (handles refresh without re-login).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) => {
        // Sync to cookie for axios interceptor
        Cookies.set('auth_token', token, {
          expires: 7,
          sameSite: 'lax',
          // secure: true  ← enable in production (HTTPS only)
        });
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
      // Only persist these fields to localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Fires once after localStorage is read on page load
        state?.setHasHydrated(true);
        // Re-sync cookie from persisted token (page refresh scenario)
        if (state?.token) {
          Cookies.set('auth_token', state.token, {
            expires: 7,
            sameSite: 'lax',
          });
        }
      },
    },
  ),
);
