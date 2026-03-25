import { PoolClient } from "pg";

export type InvoiceStatus = "pending" | "paid" | "overdue";

export interface InvoiceRecord {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
  createdAt: string;
}

interface CreateInvoiceInput {
  memberId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amountCents: number;
  dueDate: string;
  status?: InvoiceStatus;
}

export class InvoiceRepository {
  static async create(input: CreateInvoiceInput, client: PoolClient): Promise<InvoiceRecord> {
    const result = await client.query(
      `
      INSERT INTO invoices (member_id, subscription_id, invoice_number, amount_cents, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, member_id, subscription_id, invoice_number, amount_cents, due_date, status, issued_at, paid_at, created_at
      `,
      [
        input.memberId,
        input.subscriptionId ?? null,
        input.invoiceNumber,
        input.amountCents,
        input.dueDate,
        input.status ?? "pending",
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  static async list(client: PoolClient): Promise<InvoiceRecord[]> {
    const result = await client.query(`
      SELECT id, member_id, subscription_id, invoice_number, amount_cents, due_date, status, issued_at, paid_at, created_at
      FROM invoices
      ORDER BY created_at DESC
    `);
    return result.rows.map((row) => this.mapRow(row));
  }

  static async findById(id: string, client: PoolClient): Promise<InvoiceRecord | null> {
    const result = await client.query(
      `
      SELECT id, member_id, subscription_id, invoice_number, amount_cents, due_date, status, issued_at, paid_at, created_at
      FROM invoices
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

  static async setStatus(
    id: string,
    status: InvoiceStatus,
    client: PoolClient,
  ): Promise<InvoiceRecord | null> {
    const result = await client.query(
      `
      UPDATE invoices
      SET status = $2,
          paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = $1
      RETURNING id, member_id, subscription_id, invoice_number, amount_cents, due_date, status, issued_at, paid_at, created_at
      `,
      [id, status],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private static mapRow(row: Record<string, unknown>): InvoiceRecord {
    return {
      id: String(row.id),
      memberId: String(row.member_id),
      subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
      invoiceNumber: String(row.invoice_number),
      amountCents: Number(row.amount_cents),
      dueDate: String(row.due_date),
      status: row.status as InvoiceStatus,
      issuedAt: String(row.issued_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
      createdAt: String(row.created_at),
    };
  }
}
