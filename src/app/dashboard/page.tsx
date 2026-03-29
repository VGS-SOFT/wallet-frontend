'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user, isAuthenticated, _hasHydrated, clearAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait until Zustand has finished reading from localStorage
    if (!_hasHydrated) return;

    // After hydration: if not authenticated, go to login
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if API call fails, clear local state
    } finally {
      clearAuth();
      router.replace('/login');
    }
  };

  // Show spinner while Zustand is hydrating from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // After hydration, if no user — show nothing (redirect is already triggered)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-semibold text-gray-900">WalletApp</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex items-center gap-6">
          {/* Avatar */}
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name}
              width={72}
              height={72}
              className="rounded-full border-2 border-primary-100"
            />
          ) : (
            <div className="w-18 h-18 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 text-2xl font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* User Info */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}! 👋</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full w-fit mt-1">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Wallet Card — Phase 2 */}
          <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 p-6 flex flex-col gap-3 opacity-60">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-green-600 text-lg">💰</span>
            </div>
            <h3 className="font-semibold text-gray-700">My Wallet</h3>
            <p className="text-sm text-gray-400">Coming in Phase 2</p>
          </div>

          {/* Call Card — Phase 3 */}
          <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 p-6 flex flex-col gap-3 opacity-60">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-blue-600 text-lg">📞</span>
            </div>
            <h3 className="font-semibold text-gray-700">Voice Calls</h3>
            <p className="text-sm text-gray-400">Coming in Phase 3</p>
          </div>
        </div>
      </main>
    </div>
  );
}
