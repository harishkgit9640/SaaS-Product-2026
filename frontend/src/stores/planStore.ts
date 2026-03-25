import { create } from 'zustand';
import { plansApi } from '@/api';
import type { Plan, CreatePlanInput, UpdatePlanInput } from '@/types';

interface PlanState {
  plans: Plan[];
  selectedPlan: Plan | null;
  isLoading: boolean;
  error: string | null;

  fetchPlans: () => Promise<void>;
  fetchPlan: (id: string) => Promise<void>;
  createPlan: (data: CreatePlanInput) => Promise<Plan>;
  updatePlan: (id: string, data: UpdatePlanInput) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  clearSelection: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  selectedPlan: null,
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await plansApi.list();
      set({ plans, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch plans', isLoading: false });
    }
  },

  fetchPlan: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await plansApi.getById(id);
      set({ selectedPlan: plan, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch plan', isLoading: false });
    }
  },

  createPlan: async (data) => {
    const plan = await plansApi.create(data);
    set({ plans: [...get().plans, plan] });
    return plan;
  },

  updatePlan: async (id, data) => {
    const updated = await plansApi.update(id, data);
    set({
      plans: get().plans.map((p) => (p.id === id ? updated : p)),
      selectedPlan: get().selectedPlan?.id === id ? updated : get().selectedPlan,
    });
  },

  deletePlan: async (id) => {
    await plansApi.remove(id);
    set({
      plans: get().plans.filter((p) => p.id !== id),
      selectedPlan: get().selectedPlan?.id === id ? null : get().selectedPlan,
    });
  },

  clearSelection: () => set({ selectedPlan: null }),
}));
