import { PoolClient } from "pg";

export interface MemberRecord {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface CreateMemberInput {
  fullName: string;
  email: string;
  status: "active" | "inactive";
}

interface UpdateMemberInput {
  fullName?: string;
  email?: string;
  status?: "active" | "inactive";
}

export class MemberRepository {
  static async create(input: CreateMemberInput, client: PoolClient): Promise<MemberRecord> {
    const result = await client.query(
      `
      INSERT INTO members (full_name, email, status)
      VALUES ($1, $2, $3)
      RETURNING id, full_name, email, status, created_at
      `,
      [input.fullName, input.email, input.status],
    );

    return this.mapRow(result.rows[0]);
  }

  static async list(client: PoolClient): Promise<MemberRecord[]> {
    const result = await client.query(`
      SELECT id, full_name, email, status, created_at
      FROM members
      ORDER BY created_at DESC
    `);
    return result.rows.map((row) => this.mapRow(row));
  }

  static async findById(id: string, client: PoolClient): Promise<MemberRecord | null> {
    const result = await client.query(
      `
      SELECT id, full_name, email, status, created_at
      FROM members
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
    input: UpdateMemberInput,
    client: PoolClient,
  ): Promise<MemberRecord | null> {
    const current = await this.findById(id, client);
    if (!current) {
      return null;
    }

    const result = await client.query(
      `
      UPDATE members
      SET full_name = $2,
          email = $3,
          status = $4,
          updated_at = now()
      WHERE id = $1
      RETURNING id, full_name, email, status, created_at
      `,
      [id, input.fullName ?? current.fullName, input.email ?? current.email, input.status ?? current.status],
    );

    return this.mapRow(result.rows[0]);
  }

  static async remove(id: string, client: PoolClient): Promise<boolean> {
    const result = await client.query("DELETE FROM members WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private static mapRow(row: Record<string, unknown>): MemberRecord {
    return {
      id: String(row.id),
      fullName: String(row.full_name),
      email: String(row.email),
      status: row.status as "active" | "inactive",
      createdAt: String(row.created_at),
    };
  }
}
