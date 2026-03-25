import client from './client';
import type { LoginCredentials, LoginResponse, RegisterTenantInput, AuthenticatedUser, ApiResponse } from '@/types';

export const authApi = {
  login: (data: LoginCredentials) =>
    client.post<ApiResponse<LoginResponse>>('/auth/login', data).then((r) => r.data.data),

  register: (data: RegisterTenantInput) =>
    client
      .post<ApiResponse<{ tenantId: string; tenantCode: string; adminUserId: string }>>(
        '/auth/register-tenant',
        data,
      )
      .then((r) => r.data.data),

  me: () =>
    client.get<ApiResponse<AuthenticatedUser>>('/auth/me').then((r) => r.data.data),
};
