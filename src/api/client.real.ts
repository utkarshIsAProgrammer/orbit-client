import axios, { AxiosRequestConfig } from 'axios';
import { NavigateFunction } from 'react-router-dom';

let navigateFunction: NavigateFunction | null = null;
export const setNavigateFunction = (navigate: NavigateFunction) => {
  navigateFunction = navigate;
};

const API_URL = import.meta.env.VITE_API_URL || '';

export const realAxiosClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Helper to read cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

// Interceptor for CSRF token: add to headers for all requests
realAxiosClient.interceptors.request.use(
  (config) => {
    // Get CSRF token from cookie
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for 401: redirect to login if session expires
realAxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || '';
      if (status === 401 && (message.includes('Unauthorized') || message.includes('token'))) {
        if (typeof window !== 'undefined' && navigateFunction) {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/forgot-password') {
            navigateFunction('/login');
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Real API object — thin wrapper around the axios client
export const realApi = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }> => {
    return realAxiosClient.get<T>(url, config);
  },
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: T }> => {
    return realAxiosClient.post<T>(url, data, config);
  },
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: T }> => {
    return realAxiosClient.put<T>(url, data, config);
  },
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: T }> => {
    return realAxiosClient.patch<T>(url, data, config);
  },
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }> => {
    return realAxiosClient.delete<T>(url, config);
  },
};
