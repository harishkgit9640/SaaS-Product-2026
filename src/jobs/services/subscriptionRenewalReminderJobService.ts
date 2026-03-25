import { runInTenantTransaction } from "../../utils/tenantDb";
import { TenantRecord } from "../../repositories/tenantRepository";

export class SubscriptionRenewalReminderJobService {
  static async runForTenant(tenant: TenantRecord): Promise<void> {
    await runInTenantTransaction(tenant.schemaName, async (client) => {
      await client.query(`
        INSERT INTO notifications (member_id, type, channel, message, status, metadata, created_at, updated_at)
        SELECT
          s.member_id,
          'subscription_renewal_reminder',
          'in_app',
          'Your subscription will renew in 7 days',
          'pending',
          jsonb_build_object('subscriptionId', s.id, 'renewalDate', s.end_date),
          now(),
          now()
        FROM subscriptions s
        WHERE s.status = 'active'
          AND s.end_date = CURRENT_DATE + INTERVAL '7 days'
      `);
    });
  }
}
