import client from './client';
import type { Plan, CreatePlanInput, UpdatePlanInput, ApiResponse } from '@/types';

export const plansApi = {
  list: () =>
    client.get<ApiResponse<Plan[]>>('/plans').then((r) => r.data.data),

  getById: (id: string) =>
    client.get<ApiResponse<Plan>>(`/plans/${id}`).then((r) => r.data.data),

  create: (data: CreatePlanInput) =>
    client.post<ApiResponse<Plan>>('/plans', data).then((r) => r.data.data),

  update: (id: string, data: UpdatePlanInput) =>
    client.put<ApiResponse<Plan>>(`/plans/${id}`, data).then((r) => r.data.data),

  remove: (id: string) =>
    client.delete(`/plans/${id}`).then((r) => r.data),
};
