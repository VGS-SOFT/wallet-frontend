'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { ApiResponse, User } from '@/types/user.types';

/**
 * OAuth Callback Page.
 * Backend redirects here with ?token=xxx after Google login.
 *
 * Flow:
 *  1. Extract token from URL
 *  2. Call GET /auth/me to verify token + fetch user
 *  3. Save user + token to Zustand store (+ cookie)
 *  4. Redirect to dashboard
 *  5. On any failure — redirect to /auth/error with reason
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
      router.replace('/auth/error?reason=no_token');
      return;
    }

    api
      .get<ApiResponse<User>>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const user = res.data.data;
        setAuth(user, token);
        router.replace('/dashboard');
      })
      .catch((err) => {
        clearAuth();
        const reason = err?.response?.status === 401 ? 'invalid_token' : 'server_error';
        router.replace(`/auth/error?reason=${reason}`);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
