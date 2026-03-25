import { StatusCodes } from "http-status-codes";
import { MemberRepository } from "../repositories/memberRepository";
import { HttpError } from "../utils/httpError";
import { runInTenantTransaction } from "../utils/tenantDb";

interface CreateMemberInput {
  fullName: string;
  email: string;
  status?: "active" | "inactive";
}

interface UpdateMemberInput {
  fullName?: string;
  email?: string;
  status?: "active" | "inactive";
}

export class MemberService {
  static async create(tenantSchema: string, input: CreateMemberInput) {
    return runInTenantTransaction(tenantSchema, async (client) =>
      MemberRepository.create(
        {
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          status: input.status ?? "active",
        },
        client,
      ),
    );
  }

  static async list(tenantSchema: string) {
    return runInTenantTransaction(tenantSchema, async (client) => MemberRepository.list(client));
  }

  static async getById(tenantSchema: string, id: string) {
    const member = await runInTenantTransaction(tenantSchema, async (client) =>
      MemberRepository.findById(id, client),
    );
    if (!member) {
      throw new HttpError("Member not found", StatusCodes.NOT_FOUND);
    }
    return member;
  }

  static async update(tenantSchema: string, id: string, input: UpdateMemberInput) {
    const member = await runInTenantTransaction(tenantSchema, async (client) =>
      MemberRepository.update(
        id,
        {
          fullName: input.fullName?.trim(),
          email: input.email?.trim().toLowerCase(),
          status: input.status,
        },
        client,
      ),
    );
    if (!member) {
      throw new HttpError("Member not found", StatusCodes.NOT_FOUND);
    }
    return member;
  }

  static async remove(tenantSchema: string, id: string) {
    const deleted = await runInTenantTransaction(tenantSchema, async (client) =>
      MemberRepository.remove(id, client),
    );
    if (!deleted) {
      throw new HttpError("Member not found", StatusCodes.NOT_FOUND);
    }
  }
}
