import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { runInTenantTransaction } from "../utils/tenantDb";
import { HttpError } from "../utils/httpError";

export class TenantController {
  // Example tenant-scoped API. Query resolves inside tenant schema only.
  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema;
      if (!tenantSchema) {
        throw new HttpError("Tenant schema missing", StatusCodes.BAD_REQUEST);
      }

      const users = await runInTenantTransaction(tenantSchema, async (client) => {
        const result = await client.query(`
          SELECT id, email, full_name, role, is_active, created_at
          FROM users
          ORDER BY created_at DESC
          LIMIT 100
        `);
        return result.rows;
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          tenantId: req.context.tenantId,
          tenantCode: req.context.tenantCode,
          users,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
