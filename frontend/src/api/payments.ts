import client from './client';
import type { Payment, CreatePaymentInput, ApiResponse } from '@/types';

export const paymentsApi = {
  create: (data: CreatePaymentInput) =>
    client.post<ApiResponse<Payment>>('/payments', data).then((r) => r.data.data),

  listByInvoice: (invoiceId: string) =>
    client.get<ApiResponse<Payment[]>>('/payments', { params: { invoiceId } }).then((r) => r.data.data),

  updateStatus: (id: string, status: string) =>
    client.patch<ApiResponse<Payment>>(`/payments/${id}/status`, { status }).then((r) => r.data.data),
};
