import { PoolClient } from "pg";

export interface PlanRecord {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  billingCycle: "monthly" | "yearly";
  status: "active" | "inactive";
  createdAt: string;
}

interface CreatePlanInput {
  name: string;
  description?: string;
  amountCents: number;
  billingCycle: "monthly" | "yearly";
  status: "active" | "inactive";
}

interface UpdatePlanInput extends Partial<CreatePlanInput> {}

export class PlanRepository {
  static async create(input: CreatePlanInput, client: PoolClient): Promise<PlanRecord> {
    const result = await client.query(
      `
      INSERT INTO plans (name, description, amount_cents, billing_cycle, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, amount_cents, billing_cycle, status, created_at
      `,
      [input.name, input.description ?? null, input.amountCents, input.billingCycle, input.status],
    );
    return this.mapRow(result.rows[0]);
  }

  static async list(client: PoolClient): Promise<PlanRecord[]> {
    const result = await client.query(`
      SELECT id, name, description, amount_cents, billing_cycle, status, created_at
      FROM plans
      ORDER BY created_at DESC
    `);
    return result.rows.map((row) => this.mapRow(row));
  }

  static async findById(id: string, client: PoolClient): Promise<PlanRecord | null> {
    const result = await client.query(
      `
      SELECT id, name, description, amount_cents, billing_cycle, status, created_at
      FROM plans
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, input: UpdatePlanInput, client: PoolClient): Promise<PlanRecord | null> {
    const current = await this.findById(id, client);
    if (!current) {
      return null;
    }

    const result = await client.query(
      `
      UPDATE plans
      SET name = $2,
          description = $3,
          amount_cents = $4,
          billing_cycle = $5,
          status = $6,
          updated_at = now()
      WHERE id = $1
      RETURNING id, name, description, amount_cents, billing_cycle, status, created_at
      `,
      [
        id,
        input.name ?? current.name,
        input.description ?? current.description,
        input.amountCents ?? current.amountCents,
        input.billingCycle ?? current.billingCycle,
        input.status ?? current.status,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  static async remove(id: string, client: PoolClient): Promise<boolean> {
    const result = await client.query("DELETE FROM plans WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private static mapRow(row: Record<string, unknown>): PlanRecord {
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      amountCents: Number(row.amount_cents),
      billingCycle: row.billing_cycle as "monthly" | "yearly",
      status: row.status as "active" | "inactive",
      createdAt: String(row.created_at),
    };
  }
}
