'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { ApiResponse, User } from '@/types/user.types';

/**
 * This page handles the OAuth callback.
 * Backend redirects here with ?token=xxx after Google login.
 * We:
 *  1. Extract the token from URL
 *  2. Fetch user profile from /auth/me
 *  3. Save user + token to Zustand store (+ cookie)
 *  4. Redirect to dashboard
 *  5. Clean the token from URL (security)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, clearAuth } = useAuthStore();
  const handled = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get('token');

    if (!token) {
      router.replace('/login');
      return;
    }

    // Fetch user profile using the token
    api
      .get<ApiResponse<User>>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const user = res.data.data;
        setAuth(user, token);
        // Clean token from URL then redirect
        router.replace('/dashboard');
      })
      .catch(() => {
        clearAuth();
        router.replace('/login');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
