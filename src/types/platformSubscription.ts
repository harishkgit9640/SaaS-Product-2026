import { BillingCycle, PlanTier } from "../config/pricing";

export type TenantSubscriptionStatus =
  | "trialing"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "expired";

export interface PlatformPlanRecord {
  id: string;
  tier: PlanTier;
  billingCycle: BillingCycle;
  name: string;
  amountCents: number;
  razorpayPlanId: string | null;
  memberLimit: number;
  invoiceLimitMonthly: number;
  adminLimit: number;
  emailLimitMonthly: number;
  features: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ActiveAddOn {
  addOnId: string;
  quantity: number;
  razorpayItemId?: string;
}

export interface TenantSubscriptionRecord {
  id: string;
  tenantId: string;
  platformPlanId: string;
  razorpaySubscriptionId: string | null;
  status: TenantSubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  addOns: ActiveAddOn[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformInvoiceRecord {
  id: string;
  tenantId: string;
  tenantSubscriptionId: string | null;
  amountCents: number;
  status: "pending" | "paid" | "failed" | "refunded";
  razorpayPaymentId: string | null;
  razorpayInvoiceId: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreatePlatformSubscriptionInput {
  tenantId: string;
  tier: PlanTier;
  billingCycle: BillingCycle;
  couponCode?: string;
}

export interface ChangePlanInput {
  tenantId: string;
  newTier: PlanTier;
  newBillingCycle: BillingCycle;
}

export interface CancelSubscriptionInput {
  tenantId: string;
  cancelAtEnd: boolean;
}

export interface PlanChangeValidation {
  isValid: boolean;
  isUpgrade: boolean;
  warnings: string[];
  blockers: string[];
  prorationAmountCents: number;
}

export interface SubscriptionWebhookPayload {
  event: string;
  payload: {
    subscription: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number | null;
        current_end: number | null;
        notes: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
  };
}
