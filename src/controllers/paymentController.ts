import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { PaymentStatus } from "../repositories/paymentRepository";
import { PaymentService } from "../services/paymentService";
import { HttpError } from "../utils/httpError";

const isValidPaymentStatus = (value: string): value is PaymentStatus =>
  value === "pending" || value === "paid" || value === "failed";

export class PaymentController {
  private static getIdParam(req: Request): string {
    const idParam = req.params.id;
    return Array.isArray(idParam) ? idParam[0] : idParam;
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, amountCents, method, status, transactionRef } = req.body ?? {};
      if (!invoiceId || amountCents === undefined) {
        throw new HttpError("invoiceId and amountCents are required", StatusCodes.BAD_REQUEST);
      }
      if (status && !isValidPaymentStatus(status)) {
        throw new HttpError("Invalid payment status", StatusCodes.BAD_REQUEST);
      }

      const tenantSchema = req.context.tenantSchema!;
      const payment = await PaymentService.createPaymentRecord(tenantSchema, {
        invoiceId,
        amountCents: Number(amountCents),
        method,
        status,
        transactionRef,
      });
      res.status(StatusCodes.CREATED).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body ?? {};
      if (!status || !isValidPaymentStatus(status)) {
        throw new HttpError("Valid status is required", StatusCodes.BAD_REQUEST);
      }
      const tenantSchema = req.context.tenantSchema!;
      const payment = await PaymentService.updatePaymentStatus(
        tenantSchema,
        this.getIdParam(req),
        status,
      );
      res.status(StatusCodes.OK).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  static async listByInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoiceId = req.query.invoiceId;
      if (!invoiceId || Array.isArray(invoiceId) || typeof invoiceId !== "string") {
        throw new HttpError("invoiceId query param is required", StatusCodes.BAD_REQUEST);
      }
      const tenantSchema = req.context.tenantSchema!;
      const payments = await PaymentService.listPaymentsByInvoice(tenantSchema, invoiceId);
      res.status(StatusCodes.OK).json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }
}
