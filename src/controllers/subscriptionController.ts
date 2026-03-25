import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { SubscriptionService } from "../services/subscriptionService";
import { HttpError } from "../utils/httpError";

export class SubscriptionController {
  private static getIdParam(req: Request): string {
    const idParam = req.params.id;
    return Array.isArray(idParam) ? idParam[0] : idParam;
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { memberId, planId, status, startDate, endDate } = req.body ?? {};
      if (!memberId || !planId || !startDate) {
        throw new HttpError(
          "memberId, planId, and startDate are required",
          StatusCodes.BAD_REQUEST,
        );
      }
      const tenantSchema = req.context.tenantSchema!;
      const subscription = await SubscriptionService.assignPlanToMember(tenantSchema, {
        memberId,
        planId,
        status,
        startDate,
        endDate,
      });
      res.status(StatusCodes.CREATED).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const subscriptions = await SubscriptionService.list(tenantSchema);
      res.status(StatusCodes.OK).json({ success: true, data: subscriptions });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const subscription = await SubscriptionService.getById(
        tenantSchema,
        this.getIdParam(req),
      );
      res.status(StatusCodes.OK).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const subscription = await SubscriptionService.update(
        tenantSchema,
        this.getIdParam(req),
        req.body ?? {},
      );
      res.status(StatusCodes.OK).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      await SubscriptionService.remove(tenantSchema, this.getIdParam(req));
      res.status(StatusCodes.OK).json({ success: true, message: "Subscription deleted" });
    } catch (error) {
      next(error);
    }
  }
}
