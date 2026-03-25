import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { InvoiceService } from "../services/invoiceService";
import { HttpError } from "../utils/httpError";

export class InvoiceController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { memberId, subscriptionId, invoiceNumber, amountCents, dueDate } = req.body ?? {};
      if (!memberId || !invoiceNumber || amountCents === undefined || !dueDate) {
        throw new HttpError(
          "memberId, invoiceNumber, amountCents, and dueDate are required",
          StatusCodes.BAD_REQUEST,
        );
      }

      const tenantSchema = req.context.tenantSchema!;
      const invoice = await InvoiceService.createInvoice(tenantSchema, {
        memberId,
        subscriptionId,
        invoiceNumber,
        amountCents: Number(amountCents),
        dueDate,
      });

      res.status(StatusCodes.CREATED).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const invoices = await InvoiceService.listInvoices(tenantSchema);
      res.status(StatusCodes.OK).json({ success: true, data: invoices });
    } catch (error) {
      next(error);
    }
  }
}
