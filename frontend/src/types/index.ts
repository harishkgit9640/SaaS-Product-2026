export type UserRole = 'Admin' | 'Member';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export interface LoginCredentials {
  tenantCode: string;
  email: string;
  password: string;
}

export interface RegisterTenantInput {
  businessName: string;
  tenantCode: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  tenant: {
    id: string;
    code: string;
    name: string;
  };
}

export interface Member {
  id: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface CreateMemberInput {
  fullName: string;
  email: string;
  status?: string;
}

export interface UpdateMemberInput {
  fullName?: string;
  email?: string;
  status?: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  billingCycle: string;
  status: string;
  createdAt: string;
}

export interface CreatePlanInput {
  name: string;
  amountCents: number;
  billingCycle: string;
  description?: string;
  status?: string;
}

export interface UpdatePlanInput {
  name?: string;
  amountCents?: number;
  billingCycle?: string;
  description?: string;
  status?: string;
}

export interface Subscription {
  id: string;
  memberId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface CreateSubscriptionInput {
  memberId: string;
  planId: string;
  startDate: string;
  status?: string;
  endDate?: string;
}

export interface UpdateSubscriptionInput {
  status?: string;
  endDate?: string;
}

export interface Invoice {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
  status: string;
  issuedAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateInvoiceInput {
  memberId: string;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
  subscriptionId?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: string | null;
  status: string;
  transactionRef: string | null;
  metadata: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreatePaymentInput {
  invoiceId: string;
  amountCents: number;
  method?: string;
  status?: string;
  transactionRef?: string;
}

export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    requestId?: string;
    details?: string;
  };
}

export interface DashboardStats {
  totalMembers: number;
  activePlans: number;
  totalRevenueCents: number;
  pendingInvoices: number;
  overdueInvoices: number;
  mrrCents: number;
}
