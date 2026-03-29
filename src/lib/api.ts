import axios from 'axios';
import Cookies from 'js-cookie';

/**
 * Central Axios instance.
 * - Automatically attaches JWT token to every request.
 * - Handles 401 globally — clears token and redirects to login.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
