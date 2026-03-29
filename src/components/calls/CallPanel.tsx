'use client';

import { useEffect, useState } from 'react';
import { useCall } from '@/hooks/useCall';
import { useWallet } from '@/hooks/useWallet';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { CallSession } from '@/types/call.types';

// ─── HELPERS ─────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  }).format(amount);
}

// ─── MIC PERMISSION SCREEN ─────────────────────────────────────────────
interface MicGateProps {
  permission: string;
  onAllow: () => void;
  onDeny: () => void;
}
function MicGate({ permission, onAllow, onDeny }: MicGateProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-blue-50 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
          🎤
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">Microphone Required</p>
          <p className="text-sm text-gray-500 mt-1">
            This call will be recorded. Please allow microphone access to continue.
          </p>
        </div>
        {permission === 'requesting' && (
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Waiting for browser permission…
          </div>
        )}
      </div>

      {permission === 'idle' && (
        <button
          onClick={onAllow}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
        >
          <span className="text-xl">🎤</span> Allow &amp; Start Call
        </button>
      )}

      {permission === 'denied' && (
        <div className="flex flex-col gap-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            🔇 Microphone access was denied. The call will not be recorded.
          </div>
          <button
            onClick={onDeny}
            className="w-full py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
          >
            Continue without recording
          </button>
          <button
            onClick={onAllow}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CALL SUMMARY ───────────────────────────────────────────────────
function CallSummary({ session, onDismiss }: { session: CallSession; onDismiss: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">✅</div>
        <div>
          <h3 className="font-semibold text-gray-900">Call Ended</h3>
          <p className="text-sm text-gray-400">Here&apos;s your call summary</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Duration</p>
          <p className="font-bold text-gray-900">
            {session.duration_seconds !== undefined ? formatDuration(session.duration_seconds) : '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Charged</p>
          <p className="font-bold text-red-500">
            {session.total_cost !== undefined ? formatCurrency(session.total_cost) : '—'}
          </p>
        </div>
      </div>
      {session.recording_url && (
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-500 font-medium mb-2">🎤 Recording</p>
          <audio controls className="w-full h-10" src={session.recording_url} />
        </div>
      )}
      {!session.recording_url && (
        <p className="text-xs text-gray-400 text-center">No recording for this call</p>
      )}
      <button
        onClick={onDismiss}
        className="w-full py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}

// ─── MAIN PANEL ──────────────────────────────────────────────────────────
/**
 * Call flow (strict order):
 *   1. User clicks "Start Call"
 *   2. MicGate shown — billing has NOT started yet
 *   3. Browser permission dialog appears
 *   4a. Granted → initiateCall() fires → startRecording(sessionId)
 *   4b. Denied  → user can proceed without recording OR retry
 *   5. Call is live, timer running
 *   6. End Call → stopAndUpload() → endCall(recordingPath)
 */
export default function CallPanel() {
  const { activeSession, isLoading, error, elapsedSeconds, initiateCall, endCall, fetchCallHistory, callHistory } = useCall();
  const { fetchBalance } = useWallet();
  const { micPermission, isRecording, requestMic, startRecording, stopAndUpload, cancel } = useMediaRecorder();

  const [phase, setPhase] = useState<'idle' | 'mic-gate' | 'active' | 'ending'>('idle');
  const [endedSession, setEndedSession] = useState<CallSession | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Restore active session on page refresh
  useEffect(() => {
    if (activeSession) setPhase('active');
  }, [activeSession]);

  useEffect(() => {
    if (!historyLoaded) fetchCallHistory(1).then(() => setHistoryLoaded(true));
  }, []);

  // ─── Step 1: Show mic gate ─────────────────────────────────────────
  const handleStartCallClick = () => {
    setEndedSession(null);
    setPhase('mic-gate');
    // Immediately trigger the browser permission dialog
    requestMic();
  };

  // ─── Step 2a: Mic granted OR user chose to continue without recording ──
  const handleProceedToCall = async (withRecording: boolean) => {
    // Open billing session
    const session = await initiateCall();
    if (!session) {
      // initiateCall failed (e.g. insufficient balance)
      setPhase('idle');
      cancel();
      return;
    }
    setPhase('active');
    // Start recording only if mic was granted
    if (withRecording) {
      await startRecording(session.id);
    }
  };

  // Auto-proceed once mic is granted
  useEffect(() => {
    if (phase === 'mic-gate' && micPermission === 'granted') {
      handleProceedToCall(true);
    }
  }, [micPermission, phase]);

  // ─── Step 3: End call ─────────────────────────────────────────────
  const handleEnd = async () => {
    setPhase('ending');
    let recordingPath: string | null = null;
    if (isRecording) {
      recordingPath = await stopAndUpload();
    }
    const session = await endCall(recordingPath);
    if (session) {
      setEndedSession(session);
      fetchBalance();
      fetchCallHistory(1);
    }
    setPhase('idle');
  };

  const estimatedCost = activeSession
    ? Number((Math.max(elapsedSeconds, 60) / 60 * activeSession.rate_per_minute).toFixed(2))
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📞</div>
          <div>
            <h2 className="font-bold text-gray-900">Voice Calls</h2>
            <p className="text-sm text-gray-400">Recorded • Billed per second after first minute</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
        )}

        {/* ── PHASE: IDLE ── */}
        {phase === 'idle' && !activeSession && (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center text-sm">
              <span className="text-gray-500">Rate</span>
              <span className="font-semibold text-gray-900">₹2.00 / minute</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center text-sm">
              <span className="text-gray-500">Minimum to start</span>
              <span className="font-semibold text-gray-900">₹10.00</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-600 flex items-center gap-2">
              <span>🎤</span>
              <span>Microphone permission required before call starts</span>
            </div>
            <button
              onClick={handleStartCallClick}
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3 mt-2"
            >
              {isLoading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span className="text-xl">📞</span>Start Call</>}
            </button>
          </div>
        )}

        {/* ── PHASE: MIC GATE ── */}
        {phase === 'mic-gate' && (
          <MicGate
            permission={micPermission}
            onAllow={() => requestMic()}
            onDeny={() => handleProceedToCall(false)}
          />
        )}

        {/* ── PHASE: ACTIVE ── */}
        {(phase === 'active' || (phase === 'idle' && activeSession)) && (
          <div className="flex flex-col gap-5">
            {/* Recording status banner */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Recording in progress
              </div>
            )}

            {/* Live timer */}
            <div className="bg-blue-50 rounded-2xl p-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <span className="text-blue-600 text-sm font-medium">Call in progress</span>
              </div>
              <span className="text-5xl font-mono font-bold text-blue-700 tracking-tight">
                {formatDuration(elapsedSeconds)}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-blue-500">
                  Est. charge: <span className="font-semibold">{formatCurrency(estimatedCost)}</span>
                </span>
                <span className="text-xs text-blue-400">@ ₹{activeSession?.rate_per_minute}/min</span>
              </div>
            </div>

            <button
              onClick={handleEnd}
              disabled={phase === 'ending'}
              className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
            >
              {phase === 'ending' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isRecording ? 'Saving recording…' : 'Ending call…'}
                </>
              ) : (
                <><span className="text-xl">📵</span>End Call</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Call Summary */}
      {endedSession && (
        <CallSummary session={endedSession} onDismiss={() => setEndedSession(null)} />
      )}

      {/* Call History */}
      {historyLoaded && callHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Calls</h3>
          <div className="flex flex-col gap-4">
            {callHistory.map((session) => (
              <div key={session.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      session.status === 'ended' ? 'bg-green-100'
                      : session.status === 'active' ? 'bg-blue-100'
                      : 'bg-red-100'
                    }`}>
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
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {session.total_cost != null
                      ? <p className="text-sm font-semibold text-red-500">-{formatCurrency(session.total_cost)}</p>
                      : <p className="text-sm text-gray-400">—</p>}
                  </div>
                </div>

                {session.recording_url && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-2">🎤 Recording</p>
                    <audio controls className="w-full h-10" src={session.recording_url} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
