import axios from 'axios';
import Cookies from 'js-cookie';

/**
 * Central Axios instance.
 *
 * Interceptors:
 * - Request: attaches JWT Bearer token from cookie on every request.
 * - Response: handles 401 globally — clears auth state and redirects to login.
 *
 * SSR Safety:
 * - window.location is only called inside typeof window !== 'undefined' guard.
 *   Without this, Next.js SSR build crashes because window doesn't exist on server.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Request interceptor — attach token from cookie
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally (SSR-safe)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
      // Guard: window is not available during SSR
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
