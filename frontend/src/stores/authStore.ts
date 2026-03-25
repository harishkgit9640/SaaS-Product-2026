import { create } from 'zustand';
import { authApi } from '@/api';
import type { LoginCredentials, LoginResponse, UserRole } from '@/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; role: UserRole } | null;
  tenant: { id: string; code: string; name: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'feeautomate_auth';

function persistAuth(data: LoginResponse) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadAuth(): Partial<LoginResponse> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login(credentials);
      persistAuth(data);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        tenant: data.tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: () => {
    clearAuth();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
    });
  },

  hydrate: () => {
    const stored = loadAuth();
    if (stored?.accessToken && stored?.user && stored?.tenant) {
      set({
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken ?? null,
        user: stored.user as AuthState['user'],
        tenant: stored.tenant as AuthState['tenant'],
        isAuthenticated: true,
      });
    }
  },
}));
