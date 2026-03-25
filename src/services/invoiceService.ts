import { StatusCodes } from "http-status-codes";
import { InvoiceRepository } from "../repositories/invoiceRepository";
import { MemberRepository } from "../repositories/memberRepository";
import { EmailService } from "../notifications/services/emailService";
import { getInvoiceCreationEmail } from "../notifications/templates/emailTemplates";
import { SubscriptionRepository } from "../repositories/subscriptionRepository";
import { HttpError } from "../utils/httpError";
import { runInTenantTransaction } from "../utils/tenantDb";

interface CreateInvoiceInput {
  memberId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
}

export class InvoiceService {
  static async createInvoice(tenantSchema: string, input: CreateInvoiceInput) {
    const result = await runInTenantTransaction(tenantSchema, async (client) => {
      const member = await MemberRepository.findById(input.memberId, client);
      if (!member) {
        throw new HttpError("Member not found", StatusCodes.NOT_FOUND);
      }

      if (input.subscriptionId) {
        const subscription = await SubscriptionRepository.findById(input.subscriptionId, client);
        if (!subscription) {
          throw new HttpError("Subscription not found", StatusCodes.NOT_FOUND);
        }
      }

      const invoice = await InvoiceRepository.create(
        {
          memberId: input.memberId,
          subscriptionId: input.subscriptionId,
          invoiceNumber: input.invoiceNumber.trim(),
          amountCents: input.amountCents,
          dueDate: input.dueDate,
          status: "pending",
        },
        client,
      );

      return { member, invoice };
    });

    const emailPayload = getInvoiceCreationEmail({
      memberName: result.member.fullName,
      invoiceNumber: result.invoice.invoiceNumber,
      amountCents: result.invoice.amountCents,
      dueDate: result.invoice.dueDate,
    });
    await EmailService.send({
      to: result.member.email,
      subject: emailPayload.subject,
      html: emailPayload.html,
    });

    return result.invoice;
  }

  static async listInvoices(tenantSchema: string) {
    return runInTenantTransaction(tenantSchema, async (client) => {
      await client.query(`
        UPDATE invoices
        SET status = 'overdue',
            updated_at = now()
        WHERE status = 'pending' AND due_date < CURRENT_DATE
      `);
      return InvoiceRepository.list(client);
    });
  }
}
