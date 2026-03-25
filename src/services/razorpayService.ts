import crypto from "crypto";
import Razorpay from "razorpay";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { TenantRepository } from "../repositories/tenantRepository";
import { InvoiceRepository } from "../repositories/invoiceRepository";
import { PaymentRepository } from "../repositories/paymentRepository";
import { HttpError } from "../utils/httpError";
import { runInTenantTransaction } from "../utils/tenantDb";

interface CreateRazorpayOrderInput {
  tenantCode: string;
  invoiceId: string;
  amountCents?: number;
  currency?: string;
}

interface CreateRazorpayPaymentLinkInput extends CreateRazorpayOrderInput {
  customerName?: string;
  customerEmail?: string;
}

const razorpay = new Razorpay({
  key_id: env.razorpay.keyId,
  key_secret: env.razorpay.keySecret,
});

export class RazorpayService {
  static async createOrder(input: CreateRazorpayOrderInput) {
    const tenant = await TenantRepository.findActiveByCode(input.tenantCode.toLowerCase());
    if (!tenant) {
      throw new HttpError("Invalid tenant", StatusCodes.BAD_REQUEST);
    }

    return runInTenantTransaction(tenant.schemaName, async (client) => {
      const invoice = await InvoiceRepository.findById(input.invoiceId, client);
      if (!invoice) {
        throw new HttpError("Invoice not found", StatusCodes.NOT_FOUND);
      }

      const amountCents = input.amountCents ?? invoice.amountCents;
      const order = await razorpay.orders.create({
        amount: amountCents,
        currency: input.currency ?? "INR",
        receipt: invoice.invoiceNumber.slice(0, 40),
        notes: {
          tenantCode: tenant.tenantCode,
          invoiceId: invoice.id,
        },
      });

      const payment = await PaymentRepository.create(
        {
          invoiceId: invoice.id,
          amountCents,
          method: "razorpay",
          status: "pending",
          transactionRef: order.id,
          metadata: {
            gateway: "razorpay",
            orderId: order.id,
            createdFor: "order",
          },
        },
        client,
      );

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentRecordId: payment.id,
      };
    });
  }

  static async createPaymentLink(input: CreateRazorpayPaymentLinkInput) {
    const tenant = await TenantRepository.findActiveByCode(input.tenantCode.toLowerCase());
    if (!tenant) {
      throw new HttpError("Invalid tenant", StatusCodes.BAD_REQUEST);
    }

    return runInTenantTransaction(tenant.schemaName, async (client) => {
      const invoice = await InvoiceRepository.findById(input.invoiceId, client);
      if (!invoice) {
        throw new HttpError("Invoice not found", StatusCodes.NOT_FOUND);
      }

      const amountCents = input.amountCents ?? invoice.amountCents;
      const link = await razorpay.paymentLink.create({
        amount: amountCents,
        currency: input.currency ?? "INR",
        description: `Invoice ${invoice.invoiceNumber}`,
        customer: {
          name: input.customerName,
          email: input.customerEmail,
        },
        notify: {
          email: Boolean(input.customerEmail),
          sms: false,
        },
        notes: {
          tenantCode: tenant.tenantCode,
          invoiceId: invoice.id,
        },
      });

      const payment = await PaymentRepository.create(
        {
          invoiceId: invoice.id,
          amountCents,
          method: "razorpay",
          status: "pending",
          transactionRef: link.id,
          metadata: {
            gateway: "razorpay",
            paymentLinkId: link.id,
            createdFor: "payment_link",
            shortUrl: link.short_url,
          },
        },
        client,
      );

      return {
        paymentLinkId: link.id,
        shortUrl: link.short_url,
        amount: link.amount,
        currency: link.currency,
        paymentRecordId: payment.id,
      };
    });
  }

  static verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    const expected = crypto
      .createHmac("sha256", env.razorpay.webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(signatureHeader, "utf8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  static async processWebhook(event: {
    event: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const paymentEntity = (
      ((event.payload?.payment as Record<string, unknown> | undefined)?.entity as
        | Record<string, unknown>
        | undefined) ?? {}
    );

    const notes = (paymentEntity.notes as Record<string, unknown> | undefined) ?? {};
    const tenantCode = typeof notes.tenantCode === "string" ? notes.tenantCode.toLowerCase() : null;
    const invoiceId = typeof notes.invoiceId === "string" ? notes.invoiceId : null;
    const razorpayPaymentId =
      typeof paymentEntity.id === "string" ? paymentEntity.id : null;
    const razorpayOrderId =
      typeof paymentEntity.order_id === "string" ? paymentEntity.order_id : null;

    if (!tenantCode || !invoiceId || !razorpayPaymentId) {
      throw new HttpError("Missing webhook payment metadata", StatusCodes.BAD_REQUEST);
    }

    const tenant = await TenantRepository.findActiveByCode(tenantCode);
    if (!tenant) {
      throw new HttpError("Invalid tenant in webhook payload", StatusCodes.BAD_REQUEST);
    }

    await runInTenantTransaction(tenant.schemaName, async (client) => {
      const invoice = await InvoiceRepository.findById(invoiceId, client);
      if (!invoice) {
        throw new HttpError("Invoice not found for webhook", StatusCodes.NOT_FOUND);
      }

      const paymentStatus = event.event === "payment.captured" ? "paid" : "failed";
      const transactionRef = razorpayOrderId ?? razorpayPaymentId;
      let payment = transactionRef
        ? await PaymentRepository.findByTransactionRef(transactionRef, client)
        : null;

      if (!payment) {
        payment = await PaymentRepository.create(
          {
            invoiceId: invoice.id,
            amountCents: Number(paymentEntity.amount ?? invoice.amountCents),
            method: "razorpay",
            status: paymentStatus,
            transactionRef,
            metadata: {
              gateway: "razorpay",
              webhookEvent: event.event,
              razorpayPaymentId,
              razorpayOrderId,
            },
          },
          client,
        );
      } else {
        payment = await PaymentRepository.updateGatewayDetails(
          payment.id,
          paymentStatus,
          transactionRef,
          {
            webhookEvent: event.event,
            razorpayPaymentId,
            razorpayOrderId,
            rawStatus: paymentEntity.status ?? null,
          },
          client,
        );
      }

      if (!payment) {
        throw new HttpError("Unable to persist payment webhook", StatusCodes.INTERNAL_SERVER_ERROR);
      }

      if (paymentStatus === "paid") {
        await InvoiceRepository.setStatus(invoice.id, "paid", client);
      } else if (invoice.status === "paid") {
        const nextStatus = invoice.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "pending";
        await InvoiceRepository.setStatus(invoice.id, nextStatus, client);
      }
    });
  }
}
