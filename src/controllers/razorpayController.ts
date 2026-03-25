import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "../utils/httpError";
import { RazorpayService } from "../services/razorpayService";

export class RazorpayController {
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, amountCents, currency } = req.body ?? {};
      if (!invoiceId) {
        throw new HttpError("invoiceId is required", StatusCodes.BAD_REQUEST);
      }
      const tenantCode = req.context.tenantCode;
      if (!tenantCode) {
        throw new HttpError("Tenant context missing", StatusCodes.BAD_REQUEST);
      }

      const result = await RazorpayService.createOrder({
        tenantCode,
        invoiceId,
        amountCents,
        currency,
      });
      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async createPaymentLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, amountCents, currency, customerName, customerEmail } = req.body ?? {};
      if (!invoiceId) {
        throw new HttpError("invoiceId is required", StatusCodes.BAD_REQUEST);
      }
      const tenantCode = req.context.tenantCode;
      if (!tenantCode) {
        throw new HttpError("Tenant context missing", StatusCodes.BAD_REQUEST);
      }

      const result = await RazorpayService.createPaymentLink({
        tenantCode,
        invoiceId,
        amountCents,
        currency,
        customerName,
        customerEmail,
      });
      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
