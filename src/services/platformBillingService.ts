import {
  PLAN_DEFINITIONS,
  DEFAULT_PLAN_TIER,
  getEffectiveLimits,
  PlanTier,
  BillingCycle,
} from "../config/pricing";
import { PlatformSubscriptionService } from "./platformSubscriptionService";
import { logger } from "../utils/logger";

interface TenantBillingState {
  tenantId: string;
  tenantCode: string;
  currentTier: PlanTier;
  currentCycle: BillingCycle;
  razorpaySubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  memberCount: number;
  adminCount: number;
}

interface PlanChangeResult {
  success: boolean;
  action: "upgrade" | "downgrade" | "cycle_change" | "cancel";
  effectiveDate: "immediate" | "end_of_period";
  newTier: PlanTier;
  newCycle: BillingCycle;
  prorationCents: number;
  razorpaySubscriptionId?: string;
  shortUrl?: string;
  warnings: string[];
}

export class PlatformBillingService {
  /**
   * Orchestrates a plan change (upgrade or downgrade) for a tenant.
   *
   * Upgrades are immediate with proration.
   * Downgrades take effect at the end of the current billing period.
   */
  static async changePlan(
    state: TenantBillingState,
    newTier: PlanTier,
    newCycle: BillingCycle,
    razorpayPlanId: string,
  ): Promise<PlanChangeResult> {
    const validation = PlatformSubscriptionService.validatePlanChange(
      {
        tenantId: state.tenantId,
        tenantCode: state.tenantCode,
        currentTier: state.currentTier,
        currentCycle: state.currentCycle,
        currentMemberCount: state.memberCount,
        currentAdminCount: state.adminCount,
        currentPeriodStart: state.currentPeriodStart ?? undefined,
        currentPeriodEnd: state.currentPeriodEnd ?? undefined,
        addOns: [],
      },
      newTier,
      newCycle,
    );

    if (!validation.isValid) {
      throw new Error(`Plan change blocked: ${validation.blockers.join("; ")}`);
    }

    if (validation.isUpgrade) {
      return this.processUpgrade(state, newTier, newCycle, razorpayPlanId, validation.prorationAmountCents, validation.warnings);
    }

    return this.processDowngrade(state, newTier, newCycle, razorpayPlanId, validation.warnings);
  }

  private static async processUpgrade(
    state: TenantBillingState,
    newTier: PlanTier,
    newCycle: BillingCycle,
    razorpayPlanId: string,
    prorationCents: number,
    warnings: string[],
  ): Promise<PlanChangeResult> {
    if (state.razorpaySubscriptionId) {
      await PlatformSubscriptionService.cancelSubscription(
        state.razorpaySubscriptionId,
        false,
      );
    }

    const newSub = await PlatformSubscriptionService.createSubscription(
      state.tenantId,
      state.tenantCode,
      newTier,
      newCycle,
      razorpayPlanId,
      { skipTrial: true },
    );

    logger.info("Upgrade processed", {
      tenantId: state.tenantId,
      from: `${state.currentTier}/${state.currentCycle}`,
      to: `${newTier}/${newCycle}`,
      prorationCents,
    });

    return {
      success: true,
      action: "upgrade",
      effectiveDate: "immediate",
      newTier,
      newCycle,
      prorationCents,
      razorpaySubscriptionId: newSub.razorpaySubscriptionId,
      shortUrl: newSub.shortUrl,
      warnings,
    };
  }

  private static async processDowngrade(
    state: TenantBillingState,
    newTier: PlanTier,
    newCycle: BillingCycle,
    _razorpayPlanId: string,
    warnings: string[],
  ): Promise<PlanChangeResult> {
    if (state.razorpaySubscriptionId) {
      await PlatformSubscriptionService.cancelSubscription(
        state.razorpaySubscriptionId,
        true,
      );
    }

    logger.info("Downgrade scheduled", {
      tenantId: state.tenantId,
      from: `${state.currentTier}/${state.currentCycle}`,
      to: `${newTier}/${newCycle}`,
      effectiveAt: state.currentPeriodEnd?.toISOString() ?? "immediately",
    });

    return {
      success: true,
      action: "downgrade",
      effectiveDate: "end_of_period",
      newTier,
      newCycle,
      prorationCents: 0,
      warnings,
    };
  }

  /**
   * Cancels a tenant's paid subscription.
   * Access continues until the end of the current billing period,
   * then the tenant is automatically downgraded to Starter.
   */
  static async cancelPlan(state: TenantBillingState): Promise<{
    effectiveDate: Date | null;
    downgradeToTier: PlanTier;
  }> {
    if (state.currentTier === "starter") {
      throw new Error("Cannot cancel the free Starter plan.");
    }

    if (state.razorpaySubscriptionId) {
      await PlatformSubscriptionService.cancelSubscription(
        state.razorpaySubscriptionId,
        true,
      );
    }

    logger.info("Plan cancellation scheduled", {
      tenantId: state.tenantId,
      currentTier: state.currentTier,
      effectiveAt: state.currentPeriodEnd?.toISOString(),
    });

    return {
      effectiveDate: state.currentPeriodEnd,
      downgradeToTier: DEFAULT_PLAN_TIER,
    };
  }

  /**
   * Processes the end-of-period downgrade when a subscription lapses.
   * Returns enforcement actions that the caller must apply.
   */
  static determineDowngradeEnforcement(
    currentMemberCount: number,
    currentAdminCount: number,
    newTier: PlanTier,
  ): {
    newTier: PlanTier;
    excessMembers: number;
    excessAdmins: number;
    pauseAutomations: boolean;
    downgradeAnalytics: boolean;
  } {
    const limits = getEffectiveLimits(newTier, []);
    const features = PLAN_DEFINITIONS[newTier].features;

    return {
      newTier,
      excessMembers: Math.max(0, currentMemberCount - limits.maxMembers),
      excessAdmins: Math.max(0, currentAdminCount - limits.maxAdminUsers),
      pauseAutomations: !features.autoInvoicing,
      downgradeAnalytics: features.analyticsLevel === "basic",
    };
  }

  /**
   * Generates a human-readable summary of the current billing state
   * for display in the tenant's billing settings page.
   */
  static getBillingSummary(
    tier: PlanTier,
    cycle: BillingCycle,
    periodEnd: Date | null,
    addOns: Array<{ addOnId: string; quantity: number }>,
  ): {
    planName: string;
    priceDisplay: string;
    cycleDisplay: string;
    renewsAt: string | null;
    limits: ReturnType<typeof getEffectiveLimits>;
    features: (typeof PLAN_DEFINITIONS)[PlanTier]["features"];
  } {
    const def = PLAN_DEFINITIONS[tier];
    const effectiveLimits = getEffectiveLimits(tier, addOns);
    const amount = def.pricing[cycle];

    let priceDisplay: string;
    if (amount === 0) {
      priceDisplay = "Free";
    } else {
      const rupees = (amount / 100).toLocaleString("en-IN");
      priceDisplay = `₹${rupees}`;
    }

    return {
      planName: def.name,
      priceDisplay,
      cycleDisplay: cycle === "monthly" ? "per month" : "per year",
      renewsAt: periodEnd ? periodEnd.toISOString() : null,
      limits: effectiveLimits,
      features: def.features,
    };
  }
}
