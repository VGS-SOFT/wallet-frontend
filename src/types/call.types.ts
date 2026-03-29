export type CallSessionStatus = 'active' | 'ended' | 'failed' | 'insufficient_funds';

export interface CallSession {
  id: string;
  rate_per_minute: number;
  balance_at_start: number;
  status: CallSessionStatus;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  minutes_billed?: number;
  total_cost?: number;
  failure_reason?: string;
}

export interface InitiateCallResponse {
  message: string;
  session: CallSession;
}

export interface EndCallResponse {
  message: string;
  session: CallSession & {
    duration_seconds: number;
    minutes_billed: number;
    total_cost: number;
  };
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
