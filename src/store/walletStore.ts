'use client';

import { create } from 'zustand';

interface WalletData {
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface WalletState {
  wallet: WalletData | null;
  transactions: Transaction[];
  pagination: Pagination | null;
  isLoading: boolean;
  isToppingUp: boolean;
  error: string | null;

  setWallet: (wallet: WalletData) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setPagination: (pagination: Pagination) => void;
  setLoading: (loading: boolean) => void;
  setToppingUp: (topping: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  transactions: [],
  pagination: null,
  isLoading: false,
  isToppingUp: false,
  error: null,

  setWallet: (wallet) => set({ wallet }),
  setTransactions: (transactions) => set({ transactions }),
  setPagination: (pagination) => set({ pagination }),
  setLoading: (loading) => set({ isLoading: loading }),
  setToppingUp: (topping) => set({ isToppingUp: topping }),
  setError: (error) => set({ error }),
}));
