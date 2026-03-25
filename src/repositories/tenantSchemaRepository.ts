import { PoolClient } from "pg";
import { assertSafeDbIdentifier } from "../utils/dbIdentifier";

export class TenantSchemaRepository {
  static async ensureCoreDomainTables(schemaName: string, client: PoolClient): Promise<void> {
    const safeSchema = assertSafeDbIdentifier(schemaName);

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchema}"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchema}".members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        email CITEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('active','inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchema}".plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
        billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
        status TEXT NOT NULL CHECK (status IN ('active','inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchema}".subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES "${safeSchema}".members(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES "${safeSchema}".plans(id),
        status TEXT NOT NULL CHECK (status IN ('active','pending','expired','canceled')),
        start_date DATE NOT NULL,
        end_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchema}".invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES "${safeSchema}".members(id) ON DELETE CASCADE,
        subscription_id UUID REFERENCES "${safeSchema}".subscriptions(id) ON DELETE SET NULL,
        invoice_number TEXT NOT NULL UNIQUE,
        amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
        due_date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending','paid','overdue')),
        issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchema}".payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES "${safeSchema}".invoices(id) ON DELETE CASCADE,
        amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
        method TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending','paid','failed')),
        transaction_ref TEXT UNIQUE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchema}".notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID REFERENCES "${safeSchema}".members(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'in_app',
        message TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending','sent','failed')) DEFAULT 'pending',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      ALTER TABLE "${safeSchema}".payments
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_members_status ON "${safeSchema}".members(status)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_plans_status ON "${safeSchema}".plans(status)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_subscriptions_member_id ON "${safeSchema}".subscriptions(member_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_subscriptions_plan_id ON "${safeSchema}".subscriptions(plan_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_subscriptions_status ON "${safeSchema}".subscriptions(status)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_invoices_member_id ON "${safeSchema}".invoices(member_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_invoices_status_due_date ON "${safeSchema}".invoices(status, due_date)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_payments_invoice_id ON "${safeSchema}".payments(invoice_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_payments_status ON "${safeSchema}".payments(status)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_payments_metadata_gin ON "${safeSchema}".payments USING GIN (metadata)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_notifications_member_id ON "${safeSchema}".notifications(member_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_${safeSchema}_notifications_type_status ON "${safeSchema}".notifications(type, status)`,
    );
  }
}
