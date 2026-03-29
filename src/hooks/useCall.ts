'use client';

import { useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { useCallStore } from '@/store/callStore';
import {
  InitiateCallResponse,
  EndCallResponse,
  ActiveCallResponse,
  CallHistoryResponse,
} from '@/types/call.types';

export function useCall() {
  const {
    activeSession,
    callHistory,
    isLoading,
    error,
    elapsedSeconds,
    setActiveSession,
    setCallHistory,
    setLoading,
    setError,
    setElapsedSeconds,
    reset,
  } = useCallStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // ─── Timer: runs while a call is active ──────────────────────────────
  const startTimer = useCallback((startedAt: string) => {
    const start = new Date(startedAt).getTime();
    startTimeRef.current = start;
    // Immediately set current elapsed to handle page refresh case
    setElapsedSeconds(Math.floor((Date.now() - start) / 1000));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, [setElapsedSeconds]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // ─── On mount: check if user has an active call (page refresh recovery) ───
  useEffect(() => {
    const checkActive = async () => {
      try {
        const { data } = await api.get<{ data: ActiveCallResponse }>('/calls/active');
        if (data.data.active && data.data.session) {
          setActiveSession(data.data.session);
          startTimer(data.data.session.started_at);
        }
      } catch {
        // Silently ignore — not having an active call is not an error
      }
    };
    checkActive();

    return () => stopTimer();
  }, []);

  // ─── Initiate call ───────────────────────────────────────────────────
  const initiateCall = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: InitiateCallResponse }>('/calls/initiate');
      setActiveSession(data.data.session);
      startTimer(data.data.session.started_at);
      return data.data.session;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        'Failed to start call. Please try again.';
      setError(typeof msg === 'string' ? msg : msg[0]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setActiveSession, startTimer]);

  // ─── End call ────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (!activeSession) return null;
    setLoading(true);
    setError(null);
    stopTimer();
    try {
      const { data } = await api.post<{ data: EndCallResponse }>('/calls/end', {
        session_id: activeSession.id,
        duration_seconds: elapsedSeconds > 0 ? elapsedSeconds : 1,
      });
      reset();
      return data.data.session;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        'Failed to end call.';
      setError(typeof msg === 'string' ? msg : msg[0]);
      // If end fails, restart timer so elapsed continues
      if (activeSession) startTimer(activeSession.started_at);
      return null;
    } finally {
      setLoading(false);
    }
  }, [activeSession, elapsedSeconds, setLoading, setError, stopTimer, reset, startTimer]);

  // ─── Fetch history ───────────────────────────────────────────────────
  const fetchCallHistory = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get<{ data: CallHistoryResponse }>(
        `/calls/history?page=${page}&limit=10`,
      );
      setCallHistory(data.data.sessions);
      return data.data;
    } catch {
      return null;
    }
  }, [setCallHistory]);

  return {
    activeSession,
    callHistory,
    isLoading,
    error,
    elapsedSeconds,
    initiateCall,
    endCall,
    fetchCallHistory,
  };
}
