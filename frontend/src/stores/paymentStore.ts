import { create } from 'zustand';
import { paymentsApi } from '@/api';
import type { Payment, CreatePaymentInput } from '@/types';

interface PaymentState {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;

  fetchPayments: (invoiceId: string) => Promise<void>;
  createPayment: (data: CreatePaymentInput) => Promise<Payment>;
  updatePaymentStatus: (id: string, status: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  isLoading: false,
  error: null,

  fetchPayments: async (invoiceId) => {
    set({ isLoading: true, error: null });
    try {
      const payments = await paymentsApi.listByInvoice(invoiceId);
      set({ payments, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch payments', isLoading: false });
    }
  },

  createPayment: async (data) => {
    const payment = await paymentsApi.create(data);
    set({ payments: [...get().payments, payment] });
    return payment;
  },

  updatePaymentStatus: async (id, status) => {
    const updated = await paymentsApi.updateStatus(id, status);
    set({
      payments: get().payments.map((p) => (p.id === id ? updated : p)),
    });
  },
}));
