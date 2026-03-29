'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useWallet } from '@/hooks/useWallet';
import api from '@/lib/api';
import BalanceCard from '@/components/wallet/BalanceCard';
import TopUpModal from '@/components/wallet/TopUpModal';
import TransactionList from '@/components/wallet/TransactionList';
import CallPanel from '@/components/calls/CallPanel';

type DashboardTab = 'wallet' | 'calls';

export default function DashboardPage() {
  const { user, isAuthenticated, _hasHydrated, clearAuth } = useAuthStore();
  const router = useRouter();
  const [avatarError, setAvatarError] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('wallet');

  const {
    wallet,
    transactions,
    pagination,
    isLoading: isWalletLoading,
    isToppingUp,
    error: walletError,
    topUp,
    fetchTransactions,
  } = useWallet();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.replace('/login');
  }, [_hasHydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local state regardless
    } finally {
      clearAuth();
      router.replace('/login');
    }
  };

  const handleTopUpSubmit = async (amount: number, description: string) => {
    return topUp(amount, description);
  };

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const showAvatar = !!user.avatar_url && !avatarError;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
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

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* User Welcome Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          {showAvatar ? (
            <Image
              src={user.avatar_url!}
              alt={user.name}
              width={60}
              height={60}
              className="rounded-full border-2 border-primary-100 flex-shrink-0"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-[60px] h-[60px] bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 text-xl font-bold">
                {user.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Welcome back, {user.name}! 👋</h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'wallet'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💰 Wallet
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'calls'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📞 Calls
          </button>
        </div>

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <>
            {isWalletLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : walletError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
                {walletError}
              </div>
            ) : wallet ? (
              <>
                <BalanceCard
                  balance={wallet.balance}
                  currency={wallet.currency}
                  onTopUp={() => setIsTopUpOpen(true)}
                />
                <TransactionList
                  transactions={transactions}
                  pagination={pagination}
                  onPageChange={(page) => fetchTransactions(page)}
                />
              </>
            ) : null}
          </>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && <CallPanel />}
      </main>

      {/* Top-Up Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        isLoading={isToppingUp}
        onClose={() => setIsTopUpOpen(false)}
        onSubmit={handleTopUpSubmit}
      />
    </div>
  );
}
