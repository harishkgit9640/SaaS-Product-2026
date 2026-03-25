import { StatusCodes } from "http-status-codes";
import { PlanRepository } from "../repositories/planRepository";
import { HttpError } from "../utils/httpError";
import { runInTenantTransaction } from "../utils/tenantDb";

interface CreatePlanInput {
  name: string;
  description?: string;
  amountCents: number;
  billingCycle: "monthly" | "yearly";
  status?: "active" | "inactive";
}

interface UpdatePlanInput {
  name?: string;
  description?: string;
  amountCents?: number;
  billingCycle?: "monthly" | "yearly";
  status?: "active" | "inactive";
}

export class PlanService {
  static async create(tenantSchema: string, input: CreatePlanInput) {
    return runInTenantTransaction(tenantSchema, async (client) =>
      PlanRepository.create(
        {
          name: input.name.trim(),
          description: input.description?.trim(),
          amountCents: input.amountCents,
          billingCycle: input.billingCycle,
          status: input.status ?? "active",
        },
        client,
      ),
    );
  }

  static async list(tenantSchema: string) {
    return runInTenantTransaction(tenantSchema, async (client) => PlanRepository.list(client));
  }

  static async getById(tenantSchema: string, id: string) {
    const plan = await runInTenantTransaction(tenantSchema, async (client) =>
      PlanRepository.findById(id, client),
    );
    if (!plan) {
      throw new HttpError("Plan not found", StatusCodes.NOT_FOUND);
    }
    return plan;
  }

  static async update(tenantSchema: string, id: string, input: UpdatePlanInput) {
    const plan = await runInTenantTransaction(tenantSchema, async (client) =>
      PlanRepository.update(
        id,
        {
          name: input.name?.trim(),
          description: input.description?.trim(),
          amountCents: input.amountCents,
          billingCycle: input.billingCycle,
          status: input.status,
        },
        client,
      ),
    );
    if (!plan) {
      throw new HttpError("Plan not found", StatusCodes.NOT_FOUND);
    }
    return plan;
  }

  static async remove(tenantSchema: string, id: string) {
    const deleted = await runInTenantTransaction(tenantSchema, async (client) =>
      PlanRepository.remove(id, client),
    );
    if (!deleted) {
      throw new HttpError("Plan not found", StatusCodes.NOT_FOUND);
    }
  }
}
