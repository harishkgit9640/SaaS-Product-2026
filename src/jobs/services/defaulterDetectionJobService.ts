import { runInTenantTransaction } from "../../utils/tenantDb";
import { TenantRecord } from "../../repositories/tenantRepository";

export class DefaulterDetectionJobService {
  static async runForTenant(tenant: TenantRecord): Promise<void> {
    await runInTenantTransaction(tenant.schemaName, async (client) => {
      await client.query(`
        UPDATE invoices
        SET status = 'overdue',
            updated_at = now()
        WHERE status = 'pending'
          AND due_date < CURRENT_DATE
      `);

      await client.query(`
        INSERT INTO notifications (member_id, type, channel, message, status, metadata, created_at, updated_at)
        SELECT
          i.member_id,
          'defaulter_detected',
          'in_app',
          CONCAT('Member marked as defaulter due to overdue invoice ', i.invoice_number),
          'pending',
          jsonb_build_object('invoiceId', i.id, 'daysOverdue', CURRENT_DATE - i.due_date),
          now(),
          now()
        FROM invoices i
        WHERE i.status = 'overdue'
          AND i.due_date <= CURRENT_DATE - INTERVAL '30 days'
      `);
    });
  }
}
