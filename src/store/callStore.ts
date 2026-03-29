'use client';

import { create } from 'zustand';
import { CallSession } from '@/types/call.types';

interface CallState {
  activeSession: CallSession | null;
  callHistory: CallSession[];
  isLoading: boolean;
  error: string | null;
  // Elapsed seconds — driven by useCall hook timer
  elapsedSeconds: number;

  setActiveSession: (session: CallSession | null) => void;
  setCallHistory: (sessions: CallSession[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setElapsedSeconds: (seconds: number) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeSession: null,
  callHistory: [],
  isLoading: false,
  error: null,
  elapsedSeconds: 0,

  setActiveSession: (session) => set({ activeSession: session }),
  setCallHistory: (sessions) => set({ callHistory: sessions }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),
  reset: () => set({ activeSession: null, elapsedSeconds: 0, error: null }),
}));
