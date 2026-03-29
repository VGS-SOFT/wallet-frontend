'use client';

import { useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useWalletStore } from '@/store/walletStore';

interface WalletResponse {
  balance: number;
  currency: string;
}

interface TransactionResponse {
  transactions: Array<{
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export function useWallet() {
  const {
    wallet,
    transactions,
    pagination,
    isLoading,
    isToppingUp,
    error,
    setWallet,
    setTransactions,
    setPagination,
    setLoading,
    setToppingUp,
    setError,
  } = useWalletStore();

  const fetchBalance = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: WalletResponse }>('/wallet/balance');
      setWallet(data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load wallet');
    }
  }, [setWallet, setError]);

  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get<{ data: TransactionResponse }>(
        `/wallet/transactions?page=${page}&limit=10`,
      );
      setTransactions(data.data.transactions);
      setPagination(data.data.pagination);
    } catch {
      // Non-critical, silently fail
    }
  }, [setTransactions, setPagination]);

  const topUp = useCallback(async (amount: number, description: string) => {
    setToppingUp(true);
    setError(null);
    try {
      await api.post('/wallet/topup', { amount, description });
      await Promise.all([fetchBalance(), fetchTransactions(1)]);
      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        'Top-up failed. Please try again.';
      setError(typeof msg === 'string' ? msg : msg[0]);
      return false;
    } finally {
      setToppingUp(false);
    }
  }, [fetchBalance, fetchTransactions, setToppingUp, setError]);

  useEffect(() => {
    if (!wallet) {
      setLoading(true);
      Promise.all([fetchBalance(), fetchTransactions(1)]).finally(() =>
        setLoading(false),
      );
    }
  }, []);

  return {
    wallet,
    transactions,
    pagination,
    isLoading,
    isToppingUp,
    error,
    fetchBalance,
    topUp,
    fetchTransactions,
  };
}
