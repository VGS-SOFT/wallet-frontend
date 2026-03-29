'use client';

import { Transaction, TransactionPagination } from '@/types/wallet.types';

interface TransactionListProps {
  transactions: Transaction[];
  pagination: TransactionPagination | null;
  onPageChange: (page: number) => void;
}

export default function TransactionList({
  transactions,
  pagination,
  onPageChange,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-3xl mb-2">💳</p>
        <p className="text-gray-500 text-sm">No transactions yet. Add money to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Transaction History</h3>
        {pagination && (
          <p className="text-xs text-gray-400 mt-0.5">{pagination.total} transactions total</p>
        )}
      </div>

      <ul className="divide-y divide-gray-50">
        {transactions.map((tx) => {
          const isCredit = tx.type === 'credit';
          const formattedAmount = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(tx.amount);
          const formattedBalance = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(tx.balance_after);
          const date = new Date(tx.created_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });

          return (
            <li key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                {/* Transaction Type Icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCredit ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span className="text-base">{isCredit ? '⬆️' : '⬇️'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-400">{date}</p>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  isCredit ? 'text-green-600' : 'text-red-500'
                }`}>
                  {isCredit ? '+' : '-'}{formattedAmount}
                </p>
                <p className="text-xs text-gray-400">Bal: {formattedBalance}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="text-sm text-primary-600 disabled:text-gray-300 hover:underline"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="text-sm text-primary-600 disabled:text-gray-300 hover:underline"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
