'use client';

import { useState } from 'react';

interface TopUpModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (amount: number, description: string) => Promise<boolean>;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function TopUpModal({ isOpen, isLoading, onClose, onSubmit }: TopUpModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const parsed = parseFloat(amount);

    // Client-side validation (mirrors backend rules)
    if (!amount || isNaN(parsed)) {
      return setValidationError('Please enter a valid amount.');
    }
    if (parsed < 1) {
      return setValidationError('Minimum amount is ₹1.');
    }
    if (parsed > 100000) {
      return setValidationError('Maximum amount is ₹1,00,000 per transaction.');
    }
    // Enforce max 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return setValidationError('Amount can have at most 2 decimal places.');
    }

    const success = await onSubmit(parsed, description || 'Wallet Top-Up');
    if (success) {
      setAmount('');
      setDescription('');
      onClose();
    }
  };

  const handleClose = () => {
    if (isLoading) return; // prevent close while submitting
    setAmount('');
    setDescription('');
    setValidationError('');
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()} // prevent backdrop click from closing
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add Money to Wallet</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Quick Amount Buttons */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick Select</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    amount === String(q)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-200 text-gray-700 hover:border-primary-400'
                  }`}
                >
                  ₹{q.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setValidationError('');
              }}
              placeholder="Enter amount"
              min="1"
              max="100000"
              step="0.01"
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Description Input */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly recharge"
              maxLength={255}
              className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <p className="text-red-500 text-sm">{validationError}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !amount}
            className="w-full bg-primary-600 text-white rounded-xl py-3 font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Add Money'}
          </button>
        </form>
      </div>
    </div>
  );
}
