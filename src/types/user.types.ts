export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}
