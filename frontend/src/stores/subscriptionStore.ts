import { create } from 'zustand';
import { subscriptionsApi } from '@/api';
import type { Subscription, CreateSubscriptionInput, UpdateSubscriptionInput } from '@/types';

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;

  fetchSubscriptions: () => Promise<void>;
  createSubscription: (data: CreateSubscriptionInput) => Promise<Subscription>;
  updateSubscription: (id: string, data: UpdateSubscriptionInput) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  isLoading: false,
  error: null,

  fetchSubscriptions: async () => {
    set({ isLoading: true, error: null });
    try {
      const subscriptions = await subscriptionsApi.list();
      set({ subscriptions, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch subscriptions', isLoading: false });
    }
  },

  createSubscription: async (data) => {
    const sub = await subscriptionsApi.create(data);
    set({ subscriptions: [...get().subscriptions, sub] });
    return sub;
  },

  updateSubscription: async (id, data) => {
    const updated = await subscriptionsApi.update(id, data);
    set({
      subscriptions: get().subscriptions.map((s) => (s.id === id ? updated : s)),
    });
  },

  deleteSubscription: async (id) => {
    await subscriptionsApi.remove(id);
    set({
      subscriptions: get().subscriptions.filter((s) => s.id !== id),
    });
  },
}));
