import { create } from 'zustand';
import { invoicesApi } from '@/api';
import type { Invoice, CreateInvoiceInput } from '@/types';

interface InvoiceState {
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;

  fetchInvoices: () => Promise<void>;
  createInvoice: (data: CreateInvoiceInput) => Promise<Invoice>;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  isLoading: false,
  error: null,

  fetchInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await invoicesApi.list();
      set({ invoices, isLoading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch invoices', isLoading: false });
    }
  },

  createInvoice: async (data) => {
    const invoice = await invoicesApi.create(data);
    set({ invoices: [...get().invoices, invoice] });
    return invoice;
  },
}));
