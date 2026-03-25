import client from './client';
import type { ApiResponse } from '@/types';

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  paymentRecordId: string;
}

interface CreatePaymentLinkResponse {
  paymentLinkId: string;
  shortUrl: string;
  amount: number;
  currency: string;
  paymentRecordId: string;
}

export const razorpayApi = {
  createOrder: (invoiceId: string, amountCents?: number, currency?: string) =>
    client
      .post<ApiResponse<CreateOrderResponse>>('/razorpay/order', {
        invoiceId,
        amountCents,
        currency,
      })
      .then((r) => r.data.data),

  createPaymentLink: (data: {
    invoiceId: string;
    amountCents?: number;
    currency?: string;
    customerName?: string;
    customerEmail?: string;
  }) =>
    client
      .post<ApiResponse<CreatePaymentLinkResponse>>('/razorpay/payment-link', data)
      .then((r) => r.data.data),
};
