import client from './client';
import type { Invoice, CreateInvoiceInput, ApiResponse } from '@/types';

export const invoicesApi = {
  list: () =>
    client.get<ApiResponse<Invoice[]>>('/invoices').then((r) => r.data.data),

  create: (data: CreateInvoiceInput) =>
    client.post<ApiResponse<Invoice>>('/invoices', data).then((r) => r.data.data),
};
