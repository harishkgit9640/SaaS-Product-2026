import { PoolClient } from "pg";
import { dbPool } from "../config/db";
import { assertSafeDbIdentifier } from "./dbIdentifier";

export const runInTenantTransaction = async <T>(
  tenantSchema: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const safeTenantSchema = assertSafeDbIdentifier(tenantSchema);
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO "${safeTenantSchema}", public`);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
