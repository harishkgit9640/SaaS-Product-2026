import { runInTenantTransaction } from "../../utils/tenantDb";
import { EmailService } from "../../notifications/services/emailService";
import { getPaymentReminderEmail } from "../../notifications/templates/emailTemplates";
import { TenantRecord } from "../../repositories/tenantRepository";

export class PaymentReminderJobService {
  static async runForTenant(tenant: TenantRecord): Promise<void> {
    const reminders = await runInTenantTransaction(tenant.schemaName, async (client) => {
      await client.query(
        `
        INSERT INTO notifications (member_id, type, channel, message, status, metadata, created_at, updated_at)
        SELECT
          i.member_id,
          'payment_reminder_before_due',
          'in_app',
          CONCAT('Reminder: Invoice ', i.invoice_number, ' is due on ', i.due_date::text),
          'pending',
          jsonb_build_object('invoiceId', i.id, 'stage', 'before_due'),
          now(),
          now()
        FROM invoices i
        WHERE i.status = 'pending'
          AND i.due_date = CURRENT_DATE + INTERVAL '3 days'
        `,
      );

      await client.query(
        `
        INSERT INTO notifications (member_id, type, channel, message, status, metadata, created_at, updated_at)
        SELECT
          i.member_id,
          'payment_reminder_on_due',
          'in_app',
          CONCAT('Invoice ', i.invoice_number, ' is due today'),
          'pending',
          jsonb_build_object('invoiceId', i.id, 'stage', 'on_due'),
          now(),
          now()
        FROM invoices i
        WHERE i.status = 'pending'
          AND i.due_date = CURRENT_DATE
        `,
      );

      await client.query(
        `
        INSERT INTO notifications (member_id, type, channel, message, status, metadata, created_at, updated_at)
        SELECT
          i.member_id,
          'payment_reminder_after_due',
          'in_app',
          CONCAT('Invoice ', i.invoice_number, ' is overdue. Please pay immediately.'),
          'pending',
          jsonb_build_object('invoiceId', i.id, 'stage', 'after_due'),
          now(),
          now()
        FROM invoices i
        WHERE i.status IN ('pending', 'overdue')
          AND i.due_date = CURRENT_DATE - INTERVAL '3 days'
        `,
      );

      const reminderRows = await client.query(
        `
        SELECT
          m.email AS member_email,
          m.full_name AS member_name,
          i.invoice_number,
          i.due_date,
          n.metadata->>'stage' AS stage
        FROM notifications n
        INNER JOIN members m ON m.id = n.member_id
        LEFT JOIN invoices i ON i.id::text = n.metadata->>'invoiceId'
        WHERE n.type IN (
          'payment_reminder_before_due',
          'payment_reminder_on_due',
          'payment_reminder_after_due'
        )
          AND n.status = 'pending'
          AND n.created_at >= now() - interval '1 hour'
        `,
      );

      return reminderRows.rows;
    });

    await Promise.all(
      reminders.map(async (row) => {
        const stageValue = String(row.stage ?? "");
        const stage =
          stageValue === "before_due" || stageValue === "on_due" || stageValue === "after_due"
            ? stageValue
            : "on_due";

        const emailPayload = getPaymentReminderEmail({
          memberName: String(row.member_name),
          invoiceNumber: String(row.invoice_number),
          dueDate: String(row.due_date),
          stage,
        });
        await EmailService.send({
          to: String(row.member_email),
          subject: emailPayload.subject,
          html: emailPayload.html,
        });
      }),
    );
  }
}
