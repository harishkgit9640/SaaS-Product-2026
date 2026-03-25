import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  darkMode: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  initDarkMode: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: false,
  darkMode: false,

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    localStorage.setItem('feeautomate_dark', next ? '1' : '0');
    document.documentElement.classList.toggle('dark', next);
  },

  initDarkMode: () => {
    const stored = localStorage.getItem('feeautomate_dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === '1' : prefersDark;
    set({ darkMode: dark });
    document.documentElement.classList.toggle('dark', dark);
  },
}));
