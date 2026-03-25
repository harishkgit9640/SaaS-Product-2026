import { StatusCodes } from "http-status-codes";
import { dbPool } from "../config/db";
import { TenantSchemaRepository } from "../repositories/tenantSchemaRepository";
import { TenantRepository } from "../repositories/tenantRepository";
import { UserRepository } from "../repositories/userRepository";
import { JwtPayload, UserRole } from "../types/auth";
import { HttpError } from "../utils/httpError";
import { comparePassword, hashPassword } from "../utils/password";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

interface RegisterTenantInput {
  businessName: string;
  tenantCode: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

interface LoginInput {
  tenantCode: string;
  email: string;
  password: string;
}

export class AuthService {
  static async registerTenant(input: RegisterTenantInput): Promise<{
    tenantId: string;
    tenantCode: string;
    adminUserId: string;
  }> {
    if (input.password.length < 8) {
      throw new HttpError("Password must be at least 8 characters", StatusCodes.BAD_REQUEST);
    }

    const normalizedTenantCode = input.tenantCode.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(normalizedTenantCode)) {
      throw new HttpError(
        "tenantCode can only contain lowercase letters, numbers, and underscore",
        StatusCodes.BAD_REQUEST,
      );
    }

    const schemaName = `tenant_${normalizedTenantCode}`;
    const passwordHash = await hashPassword(input.password);
    const client = await dbPool.connect();

    try {
      await client.query("BEGIN");
      const tenant = await TenantRepository.createTenant(
        {
          tenantCode: normalizedTenantCode,
          name: input.businessName.trim(),
          schemaName,
          contactEmail: input.adminEmail.trim().toLowerCase(),
        },
        client,
      );
      await UserRepository.createTenantUsersTable(schemaName, client);
      await TenantSchemaRepository.ensureCoreDomainTables(schemaName, client);
      const user = await UserRepository.createUser(
        schemaName,
        {
          email: input.adminEmail.trim().toLowerCase(),
          fullName: input.adminName.trim(),
          passwordHash,
          role: "Admin",
        },
        client,
      );
      await client.query("COMMIT");

      return {
        tenantId: tenant.id,
        tenantCode: tenant.tenantCode,
        adminUserId: user.id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async login(input: LoginInput): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: UserRole };
    tenant: { id: string; code: string; name: string };
  }> {
    const tenant = await TenantRepository.findActiveByCode(input.tenantCode.trim().toLowerCase());
    if (!tenant) {
      throw new HttpError("Invalid credentials", StatusCodes.UNAUTHORIZED);
    }

    const client = await dbPool.connect();
    try {
      const user = await UserRepository.findByEmail(
        tenant.schemaName,
        input.email.trim().toLowerCase(),
        client,
      );

      if (!user || !user.isActive) {
        throw new HttpError("Invalid credentials", StatusCodes.UNAUTHORIZED);
      }

      const passwordValid = await comparePassword(input.password, user.passwordHash);
      if (!passwordValid) {
        throw new HttpError("Invalid credentials", StatusCodes.UNAUTHORIZED);
      }

      const payload: JwtPayload = {
        sub: user.id,
        tenantId: tenant.id,
        role: user.role,
      };

      return {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          code: tenant.tenantCode,
          name: tenant.name,
        },
      };
    } finally {
      client.release();
    }
  }
}
