import { PoolClient } from "pg";
import { assertSafeDbIdentifier } from "../utils/dbIdentifier";
import { UserRole } from "../types/auth";

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}

interface CreateUserInput {
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
}

export class UserRepository {
  static async createTenantUsersTable(schemaName: string, client: PoolClient): Promise<void> {
    const safeSchemaName = assertSafeDbIdentifier(schemaName);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchemaName}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeSchemaName}".users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email CITEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('Admin', 'Member')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  static async createUser(
    schemaName: string,
    input: CreateUserInput,
    client: PoolClient,
  ): Promise<UserRecord> {
    const safeSchemaName = assertSafeDbIdentifier(schemaName);
    const query = `
      INSERT INTO "${safeSchemaName}".users (email, full_name, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, password_hash, role, is_active
    `;
    const result = await client.query(query, [
      input.email,
      input.fullName,
      input.passwordHash,
      input.role,
    ]);
    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active,
    };
  }

  static async findByEmail(
    schemaName: string,
    email: string,
    client: PoolClient,
  ): Promise<UserRecord | null> {
    const safeSchemaName = assertSafeDbIdentifier(schemaName);
    const query = `
      SELECT id, email, full_name, password_hash, role, is_active
      FROM "${safeSchemaName}".users
      WHERE email = $1
      LIMIT 1
    `;
    const result = await client.query(query, [email]);
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active,
    };
  }
}
