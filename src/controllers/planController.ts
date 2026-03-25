import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { PlanService } from "../services/planService";
import { HttpError } from "../utils/httpError";

export class PlanController {
  private static getIdParam(req: Request): string {
    const idParam = req.params.id;
    return Array.isArray(idParam) ? idParam[0] : idParam;
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, amountCents, billingCycle, description, status } = req.body ?? {};
      if (!name || amountCents === undefined || !billingCycle) {
        throw new HttpError(
          "name, amountCents, and billingCycle are required",
          StatusCodes.BAD_REQUEST,
        );
      }
      const tenantSchema = req.context.tenantSchema!;
      const plan = await PlanService.create(tenantSchema, {
        name,
        amountCents: Number(amountCents),
        billingCycle,
        description,
        status,
      });
      res.status(StatusCodes.CREATED).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const plans = await PlanService.list(tenantSchema);
      res.status(StatusCodes.OK).json({ success: true, data: plans });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const plan = await PlanService.getById(tenantSchema, this.getIdParam(req));
      res.status(StatusCodes.OK).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const plan = await PlanService.update(tenantSchema, this.getIdParam(req), req.body ?? {});
      res.status(StatusCodes.OK).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      await PlanService.remove(tenantSchema, this.getIdParam(req));
      res.status(StatusCodes.OK).json({ success: true, message: "Plan deleted" });
    } catch (error) {
      next(error);
    }
  }
}
