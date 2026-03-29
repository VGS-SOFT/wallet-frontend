'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Wallet, Transaction, TransactionPagination } from '@/types/wallet.types';
import { ApiResponse } from '@/types/user.types';

/**
 * Custom hook for all wallet data and operations.
 * Centralizes wallet state so any component can use it without prop drilling.
 */
export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Wallet>>('/wallet/balance');
      setWallet(res.data.data);
    } catch {
      setError('Failed to load balance.');
    }
  }, []);

  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      const res = await api.get(`/wallet/transactions?page=${page}&limit=10`);
      const data = res.data.data;
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load transactions.');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchBalance(), fetchTransactions(1)]);
    setIsLoading(false);
  }, [fetchBalance, fetchTransactions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const topUp = async (amount: number, description: string): Promise<boolean> => {
    setIsToppingUp(true);
    try {
      await api.post('/wallet/topup', { amount, description });
      // Refresh balance and transactions after top-up
      await loadAll();
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message?.[0] || 'Top-up failed. Please try again.';
      setError(msg);
      return false;
    } finally {
      setIsToppingUp(false);
    }
  };

  return {
    wallet,
    transactions,
    pagination,
    isLoading,
    isToppingUp,
    error,
    topUp,
    fetchTransactions,
    refetch: loadAll,
  };
}
