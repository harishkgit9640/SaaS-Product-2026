import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const stored = localStorage.getItem('feeautomate_auth');
  if (stored) {
    try {
      const { accessToken, tenant } = JSON.parse(stored);
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      if (tenant?.id) {
        config.headers['x-tenant-id'] = tenant.id;
      }
    } catch {
      // ignore malformed storage
    }
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('feeautomate_auth');
      window.location.href = '/login';
    }
    const message =
      error.response?.data?.error?.message || error.message || 'Something went wrong';
    toast.error(message);
    return Promise.reject(error);
  },
);

export default client;
