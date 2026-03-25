import client from './client';
import type { Member, CreateMemberInput, UpdateMemberInput, ApiResponse } from '@/types';

export const membersApi = {
  list: () =>
    client.get<ApiResponse<Member[]>>('/members').then((r) => r.data.data),

  getById: (id: string) =>
    client.get<ApiResponse<Member>>(`/members/${id}`).then((r) => r.data.data),

  create: (data: CreateMemberInput) =>
    client.post<ApiResponse<Member>>('/members', data).then((r) => r.data.data),

  update: (id: string, data: UpdateMemberInput) =>
    client.put<ApiResponse<Member>>(`/members/${id}`, data).then((r) => r.data.data),

  remove: (id: string) =>
    client.delete(`/members/${id}`).then((r) => r.data),
};
