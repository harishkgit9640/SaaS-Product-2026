import { StatusCodes } from "http-status-codes";
import { InvoiceRepository } from "../repositories/invoiceRepository";
import { MemberRepository } from "../repositories/memberRepository";
import { EmailService } from "../notifications/services/emailService";
import { getPaymentReceiptEmail } from "../notifications/templates/emailTemplates";
import { PaymentRepository, PaymentStatus } from "../repositories/paymentRepository";
import { HttpError } from "../utils/httpError";
import { runInTenantTransaction } from "../utils/tenantDb";

interface CreatePaymentInput {
  invoiceId: string;
  amountCents: number;
  method?: string;
  status?: PaymentStatus;
  transactionRef?: string;
}

export class PaymentService {
  static async createPaymentRecord(tenantSchema: string, input: CreatePaymentInput) {
    return runInTenantTransaction(tenantSchema, async (client) => {
      const invoice = await InvoiceRepository.findById(input.invoiceId, client);
      if (!invoice) {
        throw new HttpError("Invoice not found", StatusCodes.NOT_FOUND);
      }

      const payment = await PaymentRepository.create(
        {
          invoiceId: input.invoiceId,
          amountCents: input.amountCents,
          method: input.method,
          status: input.status ?? "pending",
          transactionRef: input.transactionRef,
        },
        client,
      );

      if (payment.status === "paid") {
        await InvoiceRepository.setStatus(invoice.id, "paid", client);
      }

      return payment;
    });
  }

  static async updatePaymentStatus(
    tenantSchema: string,
    paymentId: string,
    status: PaymentStatus,
  ) {
    const result = await runInTenantTransaction(tenantSchema, async (client) => {
      const payment = await PaymentRepository.updateStatus(paymentId, status, client);
      if (!payment) {
        throw new HttpError("Payment not found", StatusCodes.NOT_FOUND);
      }

      let emailContext:
        | { memberEmail: string; memberName: string; invoiceNumber: string; receiptNumber: string }
        | undefined;

      if (status === "paid") {
        await InvoiceRepository.setStatus(payment.invoiceId, "paid", client);
        const invoice = await InvoiceRepository.findById(payment.invoiceId, client);
        if (!invoice) {
          throw new HttpError("Invoice not found", StatusCodes.NOT_FOUND);
        }
        const member = await MemberRepository.findById(invoice.memberId, client);
        if (member) {
          const receiptNumber =
            typeof payment.metadata.receiptNumber === "string"
              ? payment.metadata.receiptNumber
              : `RCT-${payment.id.slice(0, 8)}`;
          emailContext = {
            memberEmail: member.email,
            memberName: member.fullName,
            invoiceNumber: invoice.invoiceNumber,
            receiptNumber,
          };
        }
      } else {
        const invoice = await InvoiceRepository.findById(payment.invoiceId, client);
        if (!invoice) {
          throw new HttpError("Invoice not found", StatusCodes.NOT_FOUND);
        }
        if (invoice.status === "paid") {
          const nextStatus = invoice.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "pending";
          await InvoiceRepository.setStatus(invoice.id, nextStatus, client);
        }
      }

      return { payment, emailContext };
    });

    if (status === "paid" && result.emailContext) {
      const emailPayload = getPaymentReceiptEmail({
        memberName: result.emailContext.memberName,
        invoiceNumber: result.emailContext.invoiceNumber,
        amountCents: result.payment.amountCents,
        receiptNumber: result.emailContext.receiptNumber,
      });
      await EmailService.send({
        to: result.emailContext.memberEmail,
        subject: emailPayload.subject,
        html: emailPayload.html,
      });
    }

    return result.payment;
  }

  static async listPaymentsByInvoice(tenantSchema: string, invoiceId: string) {
    return runInTenantTransaction(tenantSchema, async (client) => {
      const invoice = await InvoiceRepository.findById(invoiceId, client);
      if (!invoice) {
        throw new HttpError("Invoice not found", StatusCodes.NOT_FOUND);
      }
      return PaymentRepository.listByInvoiceId(invoiceId, client);
    });
  }
}
