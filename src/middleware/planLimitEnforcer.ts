import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  PlanTier,
  PLAN_DEFINITIONS,
  getEffectiveLimits,
  PlanLimits,
  PlanFeatures,
} from "../config/pricing";
import { HttpError } from "../utils/httpError";

declare global {
  namespace Express {
    interface Request {
      planContext?: {
        tier: PlanTier;
        limits: PlanLimits;
        features: PlanFeatures;
      };
    }
  }
}

type LimitKey = keyof PlanLimits;
type FeatureKey = keyof PlanFeatures;

/**
 * Attaches the current tenant's plan context to the request.
 *
 * In production this would look up the tenant's active subscription
 * from the database. For now it reads from req.context or defaults
 * to "starter".
 */
export const attachPlanContext = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const ctx = req.context as unknown as Record<string, unknown>;
  const tier: PlanTier = (ctx.planTier as PlanTier) ?? "starter";
  const addOns: Array<{ addOnId: string; quantity: number }> =
    (ctx.planAddOns as Array<{ addOnId: string; quantity: number }>) ?? [];

  const limits = getEffectiveLimits(tier, addOns);
  const features = PLAN_DEFINITIONS[tier].features;

  req.planContext = { tier, limits, features };
  next();
};

/**
 * Factory: creates middleware that enforces a numeric limit.
 *
 * @param limitKey - Which limit to check (e.g. "maxMembers")
 * @param getCurrentCount - Async function that returns the tenant's
 *   current usage for this limit.
 * @param entityName - Human-readable name for error messages.
 */
export function enforcePlanLimit(
  limitKey: LimitKey,
  getCurrentCount: (req: Request) => Promise<number>,
  entityName: string,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.planContext) {
        return next();
      }

      const limit = req.planContext.limits[limitKey] as number;
      if (limit === Number.MAX_SAFE_INTEGER) {
        return next();
      }

      const current = await getCurrentCount(req);
      if (current >= limit) {
        return next(
          new HttpError(
            `Plan limit reached: your ${PLAN_DEFINITIONS[req.planContext.tier].name} plan allows ` +
            `${limit} ${entityName}. Upgrade your plan to add more.`,
            StatusCodes.FORBIDDEN,
          ),
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Factory: creates middleware that gates access to a boolean feature.
 *
 * @param featureKey - Which feature to check (e.g. "autoInvoicing")
 * @param featureName - Human-readable feature name for error messages.
 */
export function requirePlanFeature(featureKey: FeatureKey, featureName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.planContext) {
      return next();
    }

    const featureValue = req.planContext.features[featureKey];
    const enabled = featureValue === true || featureValue === "included" || featureValue === "full";

    if (!enabled) {
      return next(
        new HttpError(
          `${featureName} is not available on your ${PLAN_DEFINITIONS[req.planContext.tier].name} plan. ` +
          `Upgrade to unlock this feature.`,
          StatusCodes.FORBIDDEN,
        ),
      );
    }

    return next();
  };
}

/**
 * Factory: creates middleware that checks analytics access level.
 *
 * @param requiredLevel - Minimum analytics level required.
 */
export function requireAnalyticsLevel(requiredLevel: "standard" | "advanced" | "custom") {
  const levelOrder = ["basic", "standard", "advanced", "custom"];

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.planContext) {
      return next();
    }

    const currentIndex = levelOrder.indexOf(req.planContext.features.analyticsLevel);
    const requiredIndex = levelOrder.indexOf(requiredLevel);

    if (currentIndex < requiredIndex) {
      return next(
        new HttpError(
          `Advanced analytics requires the ${requiredLevel === "standard" ? "Growth" : "Pro"} plan or higher.`,
          StatusCodes.FORBIDDEN,
        ),
      );
    }

    return next();
  };
}
