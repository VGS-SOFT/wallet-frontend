'use client';

import { useEffect, useState } from 'react';
import { useCall } from '@/hooks/useCall';
import { useWallet } from '@/hooks/useWallet';
import { CallSession } from '@/types/call.types';

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────
// CALL SUMMARY (shown after call ends)
// ─────────────────────────────────────────────────────────
interface CallSummaryProps {
  session: CallSession;
  onDismiss: () => void;
}

function CallSummary({ session, onDismiss }: CallSummaryProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <span className="text-xl">✅</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Call Ended</h3>
          <p className="text-sm text-gray-400">Here&apos;s your call summary</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Duration</p>
          <p className="font-bold text-gray-900">
            {session.duration_seconds !== undefined
              ? formatDuration(session.duration_seconds)
              : '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Billed</p>
          <p className="font-bold text-gray-900">
            {session.minutes_billed ?? '—'} min
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Charged</p>
          <p className="font-bold text-red-500">
            {session.total_cost !== undefined
              ? formatCurrency(session.total_cost)
              : '—'}
          </p>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN CALL PANEL
// ─────────────────────────────────────────────────────────
export default function CallPanel() {
  const {
    activeSession,
    isLoading,
    error,
    elapsedSeconds,
    initiateCall,
    endCall,
    fetchCallHistory,
    callHistory,
  } = useCall();

  const { fetchBalance } = useWallet();
  const [endedSession, setEndedSession] = useState<CallSession | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Fetch history once on mount
  useEffect(() => {
    if (!historyLoaded) {
      fetchCallHistory(1).then(() => setHistoryLoaded(true));
    }
  }, []);

  const handleStart = async () => {
    setEndedSession(null);
    await initiateCall();
  };

  const handleEnd = async () => {
    const session = await endCall();
    if (session) {
      setEndedSession(session);
      // Refresh wallet balance after debit
      fetchBalance();
      // Refresh history
      fetchCallHistory(1);
    }
  };

  // Live cost estimate during call
  const estimatedCost = activeSession
    ? Number(
        (Math.ceil(elapsedSeconds / 60) * activeSession.rate_per_minute).toFixed(2),
      )
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-xl">📞</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Voice Calls</h2>
            <p className="text-sm text-gray-400">Billed per minute — only wallet balance is debited</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Active Call UI */}
        {activeSession ? (
          <div className="flex flex-col gap-5">
            {/* Live Timer */}
            <div className="bg-blue-50 rounded-2xl p-6 flex flex-col items-center gap-2">
              {/* Pulsing indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <span className="text-blue-600 text-sm font-medium">Call in progress</span>
              </div>

              {/* Timer */}
              <span className="text-5xl font-mono font-bold text-blue-700 tracking-tight">
                {formatDuration(elapsedSeconds)}
              </span>

              {/* Live cost estimate */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-blue-500">
                  Est. charge: <span className="font-semibold">{formatCurrency(estimatedCost)}</span>
                </span>
                <span className="text-xs text-blue-400">@ ₹{activeSession.rate_per_minute}/min</span>
              </div>
            </div>

            {/* End Call Button */}
            <button
              onClick={handleEnd}
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-xl">📵</span>
                  End Call
                </>
              )}
            </button>
          </div>
        ) : (
          /* Idle UI — not in a call */
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center text-sm">
              <span className="text-gray-500">Rate</span>
              <span className="font-semibold text-gray-900">₹2.00 / minute</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center text-sm">
              <span className="text-gray-500">Minimum to start</span>
              <span className="font-semibold text-gray-900">₹10.00</span>
            </div>

            <button
              onClick={handleStart}
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-xl">📞</span>
                  Start Call
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Call Summary (appears after ending a call) */}
      {endedSession && (
        <CallSummary
          session={endedSession}
          onDismiss={() => setEndedSession(null)}
        />
      )}

      {/* Call History */}
      {historyLoaded && callHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Calls</h3>
          <div className="flex flex-col gap-3">
            {callHistory.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      session.status === 'ended'
                        ? 'bg-green-100'
                        : session.status === 'failed' || session.status === 'insufficient_funds'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    {session.status === 'ended' ? '✅' : session.status === 'active' ? '📞' : '❌'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {session.duration_seconds !== undefined
                        ? formatDuration(session.duration_seconds)
                        : 'In progress'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(session.started_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {session.total_cost !== undefined && session.total_cost !== null ? (
                    <p className="text-sm font-semibold text-red-500">
                      -{formatCurrency(session.total_cost)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">—</p>
                  )}
                  {session.minutes_billed && (
                    <p className="text-xs text-gray-400">{session.minutes_billed} min billed</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
