export type CallSessionStatus = 'active' | 'ended' | 'failed' | 'insufficient_funds';

export interface CallSession {
  id: string;
  rate_per_minute: number;
  balance_at_start: number;
  status: CallSessionStatus;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  total_cost?: number;
  failure_reason?: string;
  recording_url?: string | null;  // signed URL from backend (1hr expiry) or storage path
}

export interface InitiateCallResponse {
  message: string;
  session: CallSession;
}

export interface EndCallResponse {
  message: string;
  session: CallSession;
}

export interface ActiveCallResponse {
  active: boolean;
  session: CallSession | null;
}

export interface CallHistoryResponse {
  sessions: CallSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
