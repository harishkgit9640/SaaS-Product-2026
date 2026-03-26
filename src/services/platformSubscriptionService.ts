import Razorpay from "razorpay";
import { env } from "../config/env";
import {
  PLAN_DEFINITIONS,
  TRIAL_DURATION_DAYS,
  TRIAL_PLAN_TIER,
  DEFAULT_PLAN_TIER,
  PAYMENT_GRACE_PERIOD_DAYS,
  isUpgrade,
  isDowngrade,
  calculateProration,
  getEffectiveLimits,
  PlanTier,
  BillingCycle,
} from "../config/pricing";
import {
  TenantSubscriptionStatus,
  PlanChangeValidation,
  ActiveAddOn,
} from "../types/platformSubscription";
import { logger } from "../utils/logger";

const razorpay = new Razorpay({
  key_id: env.razorpay.keyId,
  key_secret: env.razorpay.keySecret,
});

interface TenantContext {
  tenantId: string;
  tenantCode: string;
  currentTier: PlanTier;
  currentCycle: BillingCycle;
  currentMemberCount: number;
  currentAdminCount: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  addOns: ActiveAddOn[];
}

export class PlatformSubscriptionService {
  /**
   * Creates Razorpay Plan objects for all paid tiers.
   * Run once during setup or via admin CLI.
   * Returns a map of tier+cycle → razorpayPlanId.
   */
  static async seedRazorpayPlans(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const [tier, def] of Object.entries(PLAN_DEFINITIONS)) {
      if (tier === "starter" || tier === "enterprise") continue;

      for (const cycle of ["monthly", "yearly"] as BillingCycle[]) {
        const amount = def.pricing[cycle];
        if (amount <= 0) continue;

        const planKey = `feeautomate_${tier}_${cycle}`;
        const period = cycle === "monthly" ? "monthly" : "yearly";

        try {
          const rzpPlan = await razorpay.plans.create({
            period,
            interval: 1,
            item: {
              name: `FeeAutomate ${def.name} - ${cycle === "monthly" ? "Monthly" : "Yearly"}`,
              amount,
              currency: "INR",
              description: def.description,
            },
          });

          results[planKey] = rzpPlan.id;
          logger.info(`Created Razorpay plan: ${planKey} → ${rzpPlan.id}`);
        } catch (error) {
          logger.error(`Failed to create Razorpay plan: ${planKey}`, { error });
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Starts a new subscription for a tenant.
   * Handles trial initiation and Razorpay subscription creation.
   */
  static async createSubscription(
    tenantId: string,
    tenantCode: string,
    tier: PlanTier,
    billingCycle: BillingCycle,
    razorpayPlanId: string,
    options?: { couponCode?: string; skipTrial?: boolean },
  ): Promise<{
    razorpaySubscriptionId: string;
    shortUrl: string;
    status: string;
  }> {
    const def = PLAN_DEFINITIONS[tier];
    if (!def || tier === "starter") {
      throw new Error("Cannot create Razorpay subscription for Starter tier");
    }
    if (tier === "enterprise") {
      throw new Error("Enterprise subscriptions are handled via custom invoicing");
    }

    const totalCount = billingCycle === "monthly" ? 12 : 1;

    const subscriptionPayload: Record<string, unknown> = {
      plan_id: razorpayPlanId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        tenant_id: tenantId,
        tenant_code: tenantCode,
        plan_tier: tier,
        billing_cycle: billingCycle,
      },
    };

    if (!options?.skipTrial) {
      subscriptionPayload.start_at = Math.floor(
        (Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000) / 1000,
      );
    }

    if (options?.couponCode) {
      subscriptionPayload.offer_id = options.couponCode;
    }

    const subscription = await razorpay.subscriptions.create(
      subscriptionPayload as unknown as Parameters<typeof razorpay.subscriptions.create>[0],
    );

    logger.info("Created Razorpay subscription", {
      tenantId,
      tier,
      subscriptionId: subscription.id,
    });

    return {
      razorpaySubscriptionId: subscription.id,
      shortUrl: subscription.short_url ?? "",
      status: subscription.status ?? "created",
    };
  }

  /**
   * Cancels a Razorpay subscription.
   * @param atCycleEnd - If true, subscription remains active until current period ends.
   */
  static async cancelSubscription(
    razorpaySubscriptionId: string,
    atCycleEnd: boolean,
  ): Promise<void> {
    await razorpay.subscriptions.cancel(razorpaySubscriptionId, atCycleEnd);

    logger.info("Cancelled Razorpay subscription", {
      razorpaySubscriptionId,
      atCycleEnd,
    });
  }

  /**
   * Validates whether a plan change is allowed and calculates proration.
   */
  static validatePlanChange(
    ctx: TenantContext,
    newTier: PlanTier,
    newCycle: BillingCycle,
  ): PlanChangeValidation {
    const warnings: string[] = [];
    const blockers: string[] = [];

    if (newTier === ctx.currentTier && newCycle === ctx.currentCycle) {
      blockers.push("Already on this plan and billing cycle.");
      return { isValid: false, isUpgrade: false, warnings, blockers, prorationAmountCents: 0 };
    }

    if (newTier === "enterprise") {
      blockers.push("Enterprise plans require contacting sales.");
      return { isValid: false, isUpgrade: false, warnings, blockers, prorationAmountCents: 0 };
    }

    const upgrading = isUpgrade(ctx.currentTier, newTier);
    const downgrading = isDowngrade(ctx.currentTier, newTier);

    if (downgrading) {
      const newLimits = getEffectiveLimits(newTier, []);

      if (ctx.currentMemberCount > newLimits.maxMembers) {
        warnings.push(
          `You have ${ctx.currentMemberCount} members but the ${PLAN_DEFINITIONS[newTier].name} plan allows ${newLimits.maxMembers}. ` +
          `Excess members will become read-only after downgrade.`,
        );
      }

      if (ctx.currentAdminCount > newLimits.maxAdminUsers) {
        warnings.push(
          `You have ${ctx.currentAdminCount} admin users but the ${PLAN_DEFINITIONS[newTier].name} plan allows ${newLimits.maxAdminUsers}. ` +
          `Excess admins will be deactivated after downgrade.`,
        );
      }
    }

    let prorationAmountCents = 0;
    if (upgrading && ctx.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(ctx.currentPeriodEnd);
      const periodStart = ctx.currentPeriodStart ? new Date(ctx.currentPeriodStart) : now;

      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const daysInCycle = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));

      const proration = calculateProration(
        ctx.currentTier,
        newTier,
        ctx.currentCycle,
        daysRemaining,
        daysInCycle,
      );
      prorationAmountCents = proration.netCharge;
    }

    return {
      isValid: blockers.length === 0,
      isUpgrade: upgrading,
      warnings,
      blockers,
      prorationAmountCents,
    };
  }

  /**
   * Provisions a new tenant with the trial experience.
   * Returns the subscription status to be persisted.
   */
  static buildTrialSubscription(_tenantId: string): {
    status: TenantSubscriptionStatus;
    tier: PlanTier;
    trialEndsAt: Date;
  } {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

    return {
      status: "trialing",
      tier: TRIAL_PLAN_TIER,
      trialEndsAt,
    };
  }

  /**
   * Determines what happens when a trial expires.
   */
  static getPostTrialState(): {
    tier: PlanTier;
    status: TenantSubscriptionStatus;
  } {
    return {
      tier: DEFAULT_PLAN_TIER,
      status: "active",
    };
  }

  /**
   * Maps a Razorpay webhook event to a tenant subscription status update.
   */
  static mapWebhookToStatusUpdate(event: string): {
    newStatus: TenantSubscriptionStatus;
    shouldDowngrade: boolean;
    gracePeriodDays: number;
  } | null {
    switch (event) {
      case "subscription.activated":
        return { newStatus: "active", shouldDowngrade: false, gracePeriodDays: 0 };

      case "subscription.charged":
        return { newStatus: "active", shouldDowngrade: false, gracePeriodDays: 0 };

      case "subscription.pending":
        return {
          newStatus: "pending",
          shouldDowngrade: false,
          gracePeriodDays: PAYMENT_GRACE_PERIOD_DAYS,
        };

      case "subscription.halted":
        return { newStatus: "halted", shouldDowngrade: true, gracePeriodDays: 0 };

      case "subscription.cancelled":
        return { newStatus: "cancelled", shouldDowngrade: true, gracePeriodDays: 0 };

      default:
        return null;
    }
  }
}
