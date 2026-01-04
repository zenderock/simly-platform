
import axios from 'axios';
import { useAuth } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

import { useApplicationStore } from '@/store/application-store';

api.interceptors.request.use((config) => {
  const { token, organizationId } = useAuth.getState();
  const { activeAppId } = useApplicationStore.getState();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (organizationId) {
    config.headers['X-Organization-ID'] = organizationId.toString();
  }

  if (activeAppId) {
    config.headers['X-Application-ID'] = activeAppId.toString();
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on login failures (wrong credentials)
      if (error.config?.url?.includes('/auth/login')) {
         return Promise.reject(error);
      }

      // Token expired or invalid
      useAuth.getState().logout();
      // Optional: Redirect to login if window object exists
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
