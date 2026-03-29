import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Global auth store using Zustand.
 * Persists user data to localStorage so page refresh doesn't log user out.
 * Token is stored in a cookie (accessible to axios interceptor).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        // Store token in cookie for axios interceptor
        Cookies.set('auth_token', token, { expires: 7, sameSite: 'lax' });
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      clearAuth: () => {
        Cookies.remove('auth_token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      // Only persist user and token, not loading state
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
