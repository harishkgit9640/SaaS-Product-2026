import { PoolClient } from "pg";
import { dbPool } from "../config/db";

export interface TenantRecord {
  id: string;
  tenantCode: string;
  name: string;
  schemaName: string;
  status: string;
}

interface CreateTenantInput {
  tenantCode: string;
  name: string;
  schemaName: string;
  contactEmail: string;
}

export class TenantRepository {
  static async createTenant(
    input: CreateTenantInput,
    client: PoolClient,
  ): Promise<TenantRecord> {
    const query = `
      INSERT INTO public.tenants (tenant_code, name, schema_name, status, contact_email, billing_email)
      VALUES ($1, $2, $3, 'active', $4, $4)
      RETURNING id, tenant_code, name, schema_name, status
    `;

    const result = await client.query(query, [
      input.tenantCode,
      input.name,
      input.schemaName,
      input.contactEmail,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      tenantCode: row.tenant_code,
      name: row.name,
      schemaName: row.schema_name,
      status: row.status,
    };
  }

  static async findActiveByCode(tenantCode: string): Promise<TenantRecord | null> {
    const query = `
      SELECT id, tenant_code, name, schema_name, status
      FROM public.tenants
      WHERE tenant_code = $1 AND status = 'active'
      LIMIT 1
    `;
    const result = await dbPool.query(query, [tenantCode]);
    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantCode: row.tenant_code,
      name: row.name,
      schemaName: row.schema_name,
      status: row.status,
    };
  }

  static async findActiveById(tenantId: string): Promise<TenantRecord | null> {
    const query = `
      SELECT id, tenant_code, name, schema_name, status
      FROM public.tenants
      WHERE id = $1 AND status = 'active'
      LIMIT 1
    `;
    const result = await dbPool.query(query, [tenantId]);
    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantCode: row.tenant_code,
      name: row.name,
      schemaName: row.schema_name,
      status: row.status,
    };
  }

  static async listActive(): Promise<TenantRecord[]> {
    const query = `
      SELECT id, tenant_code, name, schema_name, status
      FROM public.tenants
      WHERE status = 'active'
      ORDER BY created_at ASC
    `;
    const result = await dbPool.query(query);
    return result.rows.map((row) => ({
      id: row.id,
      tenantCode: row.tenant_code,
      name: row.name,
      schemaName: row.schema_name,
      status: row.status,
    }));
  }
}
