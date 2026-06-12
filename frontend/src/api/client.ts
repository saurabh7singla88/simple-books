import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  // Empty baseURL = relative URLs.
  // In production: served from same Express origin, so /api/* goes to Express.
  // In development: Vite proxy forwards /api/* to http://localhost:4000.
  baseURL: '',
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if this was the login request itself, or if already on /login
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isAlreadyOnLogin = window.location.pathname === '/login';
      if (!isLoginRequest && !isAlreadyOnLogin) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
