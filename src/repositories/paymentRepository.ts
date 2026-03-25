import { PoolClient } from "pg";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: string | null;
  status: PaymentStatus;
  transactionRef: string | null;
  metadata: Record<string, unknown>;
  paidAt: string | null;
  createdAt: string;
}

interface CreatePaymentInput {
  invoiceId: string;
  amountCents: number;
  method?: string;
  status?: PaymentStatus;
  transactionRef?: string;
  metadata?: Record<string, unknown>;
}

export class PaymentRepository {
  static async create(input: CreatePaymentInput, client: PoolClient): Promise<PaymentRecord> {
    const result = await client.query(
      `
      INSERT INTO payments (invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, CASE WHEN $4 = 'paid' THEN now() ELSE NULL END)
      RETURNING id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at, created_at
      `,
      [
        input.invoiceId,
        input.amountCents,
        input.method ?? null,
        input.status ?? "pending",
        input.transactionRef ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  static async listByInvoiceId(invoiceId: string, client: PoolClient): Promise<PaymentRecord[]> {
    const result = await client.query(
      `
      SELECT id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at, created_at
      FROM payments
      WHERE invoice_id = $1
      ORDER BY created_at DESC
      `,
      [invoiceId],
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  static async findById(id: string, client: PoolClient): Promise<PaymentRecord | null> {
    const result = await client.query(
      `
      SELECT id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at, created_at
      FROM payments
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

  static async updateStatus(
    id: string,
    status: PaymentStatus,
    client: PoolClient,
  ): Promise<PaymentRecord | null> {
    const result = await client.query(
      `
      UPDATE payments
      SET status = $2,
          paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = $1
      RETURNING id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at, created_at
      `,
      [id, status],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  static async updateGatewayDetails(
    id: string,
    status: PaymentStatus,
    transactionRef: string | null,
    metadata: Record<string, unknown>,
    client: PoolClient,
  ): Promise<PaymentRecord | null> {
    const result = await client.query(
      `
      UPDATE payments
      SET status = $2,
          transaction_ref = COALESCE($3, transaction_ref),
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
          paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END,
          updated_at = now()
      WHERE id = $1
      RETURNING id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at, created_at
      `,
      [id, status, transactionRef, JSON.stringify(metadata)],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  static async findByTransactionRef(
    transactionRef: string,
    client: PoolClient,
  ): Promise<PaymentRecord | null> {
    const result = await client.query(
      `
      SELECT id, invoice_id, amount_cents, method, status, transaction_ref, metadata, paid_at, created_at
      FROM payments
      WHERE transaction_ref = $1
      LIMIT 1
      `,
      [transactionRef],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private static mapRow(row: Record<string, unknown>): PaymentRecord {
    return {
      id: String(row.id),
      invoiceId: String(row.invoice_id),
      amountCents: Number(row.amount_cents),
      method: row.method ? String(row.method) : null,
      status: row.status as PaymentStatus,
      transactionRef: row.transaction_ref ? String(row.transaction_ref) : null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      paidAt: row.paid_at ? String(row.paid_at) : null,
      createdAt: String(row.created_at),
    };
  }
}
