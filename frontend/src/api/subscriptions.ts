import client from './client';
import type { Subscription, CreateSubscriptionInput, UpdateSubscriptionInput, ApiResponse } from '@/types';

export const subscriptionsApi = {
  list: () =>
    client.get<ApiResponse<Subscription[]>>('/subscriptions').then((r) => r.data.data),

  getById: (id: string) =>
    client.get<ApiResponse<Subscription>>(`/subscriptions/${id}`).then((r) => r.data.data),

  create: (data: CreateSubscriptionInput) =>
    client.post<ApiResponse<Subscription>>('/subscriptions', data).then((r) => r.data.data),

  update: (id: string, data: UpdateSubscriptionInput) =>
    client.put<ApiResponse<Subscription>>(`/subscriptions/${id}`, data).then((r) => r.data.data),

  remove: (id: string) =>
    client.delete(`/subscriptions/${id}`).then((r) => r.data),
};
