import { PoolClient } from "pg";

export type SubscriptionStatus = "active" | "pending" | "expired" | "canceled";

export interface SubscriptionRecord {
  id: string;
  memberId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

interface CreateSubscriptionInput {
  memberId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
}

interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  startDate?: string;
  endDate?: string | null;
}

export class SubscriptionRepository {
  static async create(
    input: CreateSubscriptionInput,
    client: PoolClient,
  ): Promise<SubscriptionRecord> {
    const result = await client.query(
      `
      INSERT INTO subscriptions (member_id, plan_id, status, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, member_id, plan_id, status, start_date, end_date, created_at
      `,
      [input.memberId, input.planId, input.status, input.startDate, input.endDate ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  static async list(client: PoolClient): Promise<SubscriptionRecord[]> {
    const result = await client.query(`
      SELECT id, member_id, plan_id, status, start_date, end_date, created_at
      FROM subscriptions
      ORDER BY created_at DESC
    `);
    return result.rows.map((row) => this.mapRow(row));
  }

  static async findById(id: string, client: PoolClient): Promise<SubscriptionRecord | null> {
    const result = await client.query(
      `
      SELECT id, member_id, plan_id, status, start_date, end_date, created_at
      FROM subscriptions
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

  static async update(
    id: string,
    input: UpdateSubscriptionInput,
    client: PoolClient,
  ): Promise<SubscriptionRecord | null> {
    const current = await this.findById(id, client);
    if (!current) {
      return null;
    }

    const result = await client.query(
      `
      UPDATE subscriptions
      SET status = $2,
          start_date = $3,
          end_date = $4,
          updated_at = now()
      WHERE id = $1
      RETURNING id, member_id, plan_id, status, start_date, end_date, created_at
      `,
      [
        id,
        input.status ?? current.status,
        input.startDate ?? current.startDate,
        input.endDate === undefined ? current.endDate : input.endDate,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  static async remove(id: string, client: PoolClient): Promise<boolean> {
    const result = await client.query("DELETE FROM subscriptions WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private static mapRow(row: Record<string, unknown>): SubscriptionRecord {
    return {
      id: String(row.id),
      memberId: String(row.member_id),
      planId: String(row.plan_id),
      status: row.status as SubscriptionStatus,
      startDate: String(row.start_date),
      endDate: row.end_date ? String(row.end_date) : null,
      createdAt: String(row.created_at),
    };
  }
}
