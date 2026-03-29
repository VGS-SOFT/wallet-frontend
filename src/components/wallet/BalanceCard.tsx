'use client';

interface BalanceCardProps {
  balance: number;
  currency: string;
  onTopUp: () => void;
}

/**
 * Displays wallet balance with a top-up button.
 * Formats balance as Indian currency (INR).
 */
export default function BalanceCard({ balance, currency, onTopUp }: BalanceCardProps) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 2,
  }).format(balance);

  return (
    <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
      <p className="text-primary-100 text-sm font-medium">Available Balance</p>
      <p className="text-4xl font-bold mt-1 tracking-tight">{formatted}</p>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-primary-200 text-xs">WalletApp • {currency || 'INR'}</span>
        <button
          onClick={onTopUp}
          className="bg-white text-primary-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors"
        >
          + Add Money
        </button>
      </div>
    </div>
  );
}
