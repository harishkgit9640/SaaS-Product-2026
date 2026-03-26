export type PlanTier = "starter" | "growth" | "pro" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanLimits {
  maxMembers: number;
  maxInvoicesPerMonth: number;
  maxAdminUsers: number;
  maxEmailsPerMonth: number;
  dataRetentionMonths: number;
}

export interface PlanFeatures {
  autoInvoicing: boolean;
  paymentReminders: boolean;
  defaulterDetection: boolean;
  receiptGeneration: boolean;
  customWorkflows: boolean;
  analyticsLevel: "basic" | "standard" | "advanced" | "custom";
  customBranding: boolean;
  apiAccess: "none" | "readonly" | "full";
  whatsappNotifications: "none" | "addon" | "included";
  prioritySupport: boolean;
}

export interface TierPricing {
  monthly: number;
  yearly: number;
}

export interface PlatformPlanDefinition {
  tier: PlanTier;
  name: string;
  description: string;
  pricing: TierPricing;
  limits: PlanLimits;
  features: PlanFeatures;
}

export interface AddOnDefinition {
  id: string;
  name: string;
  description: string;
  pricing: TierPricing;
  applicableTiers: PlanTier[];
  unit: string;
  maxQuantity: number;
}

const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const PLAN_DEFINITIONS: Record<PlanTier, PlatformPlanDefinition> = {
  starter: {
    tier: "starter",
    name: "Starter",
    description: "Perfect for solo operators and micro-businesses getting started with digital fee collection.",
    pricing: { monthly: 0, yearly: 0 },
    limits: {
      maxMembers: 50,
      maxInvoicesPerMonth: 100,
      maxAdminUsers: 1,
      maxEmailsPerMonth: 100,
      dataRetentionMonths: 6,
    },
    features: {
      autoInvoicing: false,
      paymentReminders: false,
      defaulterDetection: false,
      receiptGeneration: false,
      customWorkflows: false,
      analyticsLevel: "basic",
      customBranding: false,
      apiAccess: "none",
      whatsappNotifications: "none",
      prioritySupport: false,
    },
  },

  growth: {
    tier: "growth",
    name: "Growth",
    description: "For growing businesses that need automation, multiple admins, and deeper insights.",
    pricing: { monthly: 99_900, yearly: 999_000 },
    limits: {
      maxMembers: 500,
      maxInvoicesPerMonth: 2_000,
      maxAdminUsers: 3,
      maxEmailsPerMonth: 2_000,
      dataRetentionMonths: 12,
    },
    features: {
      autoInvoicing: true,
      paymentReminders: true,
      defaulterDetection: false,
      receiptGeneration: false,
      customWorkflows: false,
      analyticsLevel: "standard",
      customBranding: false,
      apiAccess: "none",
      whatsappNotifications: "none",
      prioritySupport: false,
    },
  },

  pro: {
    tier: "pro",
    name: "Pro",
    description: "Full-featured plan for established businesses with advanced automation and analytics.",
    pricing: { monthly: 249_900, yearly: 2_499_000 },
    limits: {
      maxMembers: 2_000,
      maxInvoicesPerMonth: 10_000,
      maxAdminUsers: 10,
      maxEmailsPerMonth: 10_000,
      dataRetentionMonths: 24,
    },
    features: {
      autoInvoicing: true,
      paymentReminders: true,
      defaulterDetection: true,
      receiptGeneration: true,
      customWorkflows: false,
      analyticsLevel: "advanced",
      customBranding: true,
      apiAccess: "readonly",
      whatsappNotifications: "addon",
      prioritySupport: true,
    },
  },

  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "Custom solution for large organisations with dedicated support and unlimited scale.",
    pricing: { monthly: 0, yearly: 0 },
    limits: {
      maxMembers: UNLIMITED,
      maxInvoicesPerMonth: UNLIMITED,
      maxAdminUsers: UNLIMITED,
      maxEmailsPerMonth: UNLIMITED,
      dataRetentionMonths: UNLIMITED,
    },
    features: {
      autoInvoicing: true,
      paymentReminders: true,
      defaulterDetection: true,
      receiptGeneration: true,
      customWorkflows: true,
      analyticsLevel: "custom",
      customBranding: true,
      apiAccess: "full",
      whatsappNotifications: "included",
      prioritySupport: true,
    },
  },
};

export const ADD_ON_DEFINITIONS: AddOnDefinition[] = [
  {
    id: "extra_members_100",
    name: "Extra Members Pack",
    description: "Add 100 additional members to your plan limit.",
    pricing: { monthly: 19_900, yearly: 199_000 },
    applicableTiers: ["growth", "pro"],
    unit: "100 members",
    maxQuantity: 5,
  },
  {
    id: "whatsapp_notifications",
    name: "WhatsApp Notifications",
    description: "Send invoice reminders, payment receipts, and alerts via WhatsApp. Includes 1,000 messages/mo.",
    pricing: { monthly: 49_900, yearly: 499_000 },
    applicableTiers: ["growth", "pro"],
    unit: "1,000 messages/mo",
    maxQuantity: 1,
  },
  {
    id: "extra_admin_user",
    name: "Extra Admin User",
    description: "Add one additional admin user beyond your plan limit.",
    pricing: { monthly: 14_900, yearly: 149_000 },
    applicableTiers: ["growth", "pro"],
    unit: "1 admin user",
    maxQuantity: 10,
  },
  {
    id: "sms_notifications",
    name: "SMS Notifications",
    description: "SMS reminders and receipts. Includes 500 SMS/mo.",
    pricing: { monthly: 29_900, yearly: 299_000 },
    applicableTiers: ["growth", "pro"],
    unit: "500 SMS/mo",
    maxQuantity: 1,
  },
  {
    id: "custom_domain",
    name: "Custom Domain",
    description: "Use your own domain for the member portal.",
    pricing: { monthly: 19_900, yearly: 199_000 },
    applicableTiers: ["growth", "pro"],
    unit: "1 domain",
    maxQuantity: 1,
  },
  {
    id: "priority_support",
    name: "Priority Support Upgrade",
    description: "Upgrade to priority email and chat support.",
    pricing: { monthly: 49_900, yearly: 499_000 },
    applicableTiers: ["growth"],
    unit: "support upgrade",
    maxQuantity: 1,
  },
];

export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_PLAN_TIER: PlanTier = "pro";
export const DEFAULT_PLAN_TIER: PlanTier = "starter";
export const PAYMENT_GRACE_PERIOD_DAYS = 3;

export const DISCOUNT_YEARLY_PERCENT = 17;
export const EARLY_ADOPTER_DISCOUNT_PERCENT = 25;
export const EARLY_ADOPTER_MAX_TENANTS = 500;
export const REFERRAL_CREDIT_CENTS = 50_000;
export const REFERRAL_REFEREE_DISCOUNT_CENTS = 25_000;
export const NONPROFIT_DISCOUNT_PERCENT = 30;

export const TIER_ORDER: PlanTier[] = ["starter", "growth", "pro", "enterprise"];

export function isUpgrade(from: PlanTier, to: PlanTier): boolean {
  return TIER_ORDER.indexOf(to) > TIER_ORDER.indexOf(from);
}

export function isDowngrade(from: PlanTier, to: PlanTier): boolean {
  return TIER_ORDER.indexOf(to) < TIER_ORDER.indexOf(from);
}

export function getLimitsForTier(tier: PlanTier): PlanLimits {
  return PLAN_DEFINITIONS[tier].limits;
}

export function getFeaturesForTier(tier: PlanTier): PlanFeatures {
  return PLAN_DEFINITIONS[tier].features;
}

export function getEffectiveLimits(
  tier: PlanTier,
  addOns: Array<{ addOnId: string; quantity: number }>,
): PlanLimits {
  const base = { ...PLAN_DEFINITIONS[tier].limits };

  for (const addOn of addOns) {
    const def = ADD_ON_DEFINITIONS.find((a) => a.id === addOn.addOnId);
    if (!def) continue;

    if (addOn.addOnId === "extra_members_100") {
      base.maxMembers += 100 * addOn.quantity;
    }
    if (addOn.addOnId === "extra_admin_user") {
      base.maxAdminUsers += addOn.quantity;
    }
  }

  return base;
}

export function getPriceInCents(tier: PlanTier, cycle: BillingCycle): number {
  return PLAN_DEFINITIONS[tier].pricing[cycle];
}

export function getAddOnPriceInCents(addOnId: string, cycle: BillingCycle): number {
  const def = ADD_ON_DEFINITIONS.find((a) => a.id === addOnId);
  return def ? def.pricing[cycle] : 0;
}

export function calculateProration(
  fromTier: PlanTier,
  toTier: PlanTier,
  cycle: BillingCycle,
  daysRemaining: number,
  daysInCycle: number,
): { credit: number; charge: number; netCharge: number } {
  const oldDaily = getPriceInCents(fromTier, cycle) / daysInCycle;
  const newDaily = getPriceInCents(toTier, cycle) / daysInCycle;
  const credit = Math.round(daysRemaining * oldDaily);
  const charge = Math.round(daysRemaining * newDaily);
  return { credit, charge, netCharge: Math.max(0, charge - credit) };
}
