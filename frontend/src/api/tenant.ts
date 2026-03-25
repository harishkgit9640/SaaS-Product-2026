import client from './client';
import type { TenantUser, ApiResponse } from '@/types';

export const tenantApi = {
  listUsers: () =>
    client
      .get<ApiResponse<{ tenantId: string; tenantCode: string; users: TenantUser[] }>>(
        '/tenant/users',
      )
      .then((r) => r.data.data),
};
