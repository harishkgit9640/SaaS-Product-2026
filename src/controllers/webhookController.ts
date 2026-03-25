import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "../utils/httpError";
import { RazorpayService } from "../services/razorpayService";
import { logger } from "../utils/logger";

export class WebhookController {
  static async razorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.header("x-razorpay-signature");
      if (!signature) {
        throw new HttpError("Missing Razorpay signature header", StatusCodes.BAD_REQUEST);
      }

      if (!Buffer.isBuffer(req.body)) {
        throw new HttpError("Webhook payload must be raw buffer", StatusCodes.BAD_REQUEST);
      }

      const isValid = RazorpayService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        throw new HttpError("Invalid webhook signature", StatusCodes.UNAUTHORIZED);
      }

      const payload = JSON.parse(req.body.toString("utf8")) as {
        event: string;
        payload?: Record<string, unknown>;
      };

      if (payload.event !== "payment.captured" && payload.event !== "payment.failed") {
        logger.info("Razorpay webhook ignored", { event: payload.event });
        res.status(StatusCodes.OK).json({ success: true, message: "Event ignored" });
        return;
      }

      await RazorpayService.processWebhook(payload);
      res.status(StatusCodes.OK).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
