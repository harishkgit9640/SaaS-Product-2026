import { StatusCodes } from "http-status-codes";
import { MemberRepository } from "../repositories/memberRepository";
import { PlanRepository } from "../repositories/planRepository";
import {
  SubscriptionRepository,
  SubscriptionStatus,
} from "../repositories/subscriptionRepository";
import { HttpError } from "../utils/httpError";
import { runInTenantTransaction } from "../utils/tenantDb";

interface AssignSubscriptionInput {
  memberId: string;
  planId: string;
  status?: SubscriptionStatus;
  startDate: string;
  endDate?: string;
}

interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  startDate?: string;
  endDate?: string | null;
}

export class SubscriptionService {
  static async assignPlanToMember(tenantSchema: string, input: AssignSubscriptionInput) {
    return runInTenantTransaction(tenantSchema, async (client) => {
      const member = await MemberRepository.findById(input.memberId, client);
      if (!member) {
        throw new HttpError("Member not found", StatusCodes.NOT_FOUND);
      }

      const plan = await PlanRepository.findById(input.planId, client);
      if (!plan) {
        throw new HttpError("Plan not found", StatusCodes.NOT_FOUND);
      }

      return SubscriptionRepository.create(
        {
          memberId: input.memberId,
          planId: input.planId,
          status: input.status ?? "active",
          startDate: input.startDate,
          endDate: input.endDate,
        },
        client,
      );
    });
  }

  static async list(tenantSchema: string) {
    return runInTenantTransaction(tenantSchema, async (client) => SubscriptionRepository.list(client));
  }

  static async getById(tenantSchema: string, id: string) {
    const subscription = await runInTenantTransaction(tenantSchema, async (client) =>
      SubscriptionRepository.findById(id, client),
    );
    if (!subscription) {
      throw new HttpError("Subscription not found", StatusCodes.NOT_FOUND);
    }
    return subscription;
  }

  static async update(tenantSchema: string, id: string, input: UpdateSubscriptionInput) {
    const subscription = await runInTenantTransaction(tenantSchema, async (client) =>
      SubscriptionRepository.update(
        id,
        {
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        client,
      ),
    );
    if (!subscription) {
      throw new HttpError("Subscription not found", StatusCodes.NOT_FOUND);
    }
    return subscription;
  }

  static async remove(tenantSchema: string, id: string) {
    const deleted = await runInTenantTransaction(tenantSchema, async (client) =>
      SubscriptionRepository.remove(id, client),
    );
    if (!deleted) {
      throw new HttpError("Subscription not found", StatusCodes.NOT_FOUND);
    }
  }
}
