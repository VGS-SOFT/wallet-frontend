export type TransactionType = 'credit' | 'debit';

export interface Wallet {
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface TransactionPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: TransactionPagination;
}
