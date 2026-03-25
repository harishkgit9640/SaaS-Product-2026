import { runInTenantTransaction } from "../../utils/tenantDb";
import { TenantRecord } from "../../repositories/tenantRepository";

const formatYYYYMM = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export class MonthlyInvoiceJobService {
  static async runForTenant(tenant: TenantRecord): Promise<void> {
    const yyyymm = formatYYYYMM(new Date());
    await runInTenantTransaction(tenant.schemaName, async (client) => {
      await client.query(
        `
        INSERT INTO invoices (member_id, subscription_id, invoice_number, amount_cents, due_date, status, issued_at, created_at, updated_at)
        SELECT
          s.member_id,
          s.id,
          CONCAT($1, '-INV-', $2, '-', LPAD(ROW_NUMBER() OVER (ORDER BY s.created_at)::text, 5, '0')),
          p.amount_cents,
          (CURRENT_DATE + INTERVAL '7 days')::date,
          'pending',
          now(),
          now(),
          now()
        FROM subscriptions s
        INNER JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'active'
          AND p.status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM invoices i
            WHERE i.subscription_id = s.id
              AND date_trunc('month', i.created_at) = date_trunc('month', now())
          )
        ON CONFLICT (invoice_number) DO NOTHING
        `,
        [tenant.tenantCode.toUpperCase(), yyyymm],
      );
    });
  }
}
