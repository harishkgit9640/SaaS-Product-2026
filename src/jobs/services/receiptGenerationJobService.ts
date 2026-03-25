import { runInTenantTransaction } from "../../utils/tenantDb";
import { TenantRecord } from "../../repositories/tenantRepository";

export class ReceiptGenerationJobService {
  static async runForTenant(tenant: TenantRecord): Promise<void> {
    await runInTenantTransaction(tenant.schemaName, async (client) => {
      await client.query(
        `
        UPDATE payments p
        SET metadata = COALESCE(p.metadata, '{}'::jsonb) || jsonb_build_object(
          'receiptGeneratedAt', now(),
          'receiptNumber', CONCAT($1, '-RCT-', to_char(now(), 'YYYYMM'), '-', substr(p.id::text, 1, 8))
        ),
            updated_at = now()
        WHERE p.status = 'paid'
          AND (p.metadata->>'receiptGeneratedAt') IS NULL
        `,
        [tenant.tenantCode.toUpperCase()],
      );
    });
  }
}
