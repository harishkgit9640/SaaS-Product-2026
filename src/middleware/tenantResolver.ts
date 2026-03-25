import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { TenantRepository } from "../repositories/tenantRepository";
import { HttpError } from "../utils/httpError";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const extractSubdomainTenantCode = (req: Request): string | null => {
  const host = req.hostname?.toLowerCase();
  if (!host) {
    return null;
  }

  const segments = host.split(".");
  if (segments.length < 3) {
    return null;
  }

  // app.example.com -> app (subdomain tenant identifier)
  return segments[0];
};

export const tenantResolverMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const headerIdentifier = req.header("x-tenant-id")?.trim().toLowerCase();
    const subdomainCode = extractSubdomainTenantCode(req);
    const tenantIdentifier = headerIdentifier || subdomainCode;

    if (!tenantIdentifier) {
      return next();
    }

    const tenant = UUID_REGEX.test(tenantIdentifier)
      ? await TenantRepository.findActiveById(tenantIdentifier)
      : await TenantRepository.findActiveByCode(tenantIdentifier);

    if (!tenant) {
      return next(new HttpError("Invalid tenant", StatusCodes.BAD_REQUEST));
    }

    req.context.tenantId = tenant.id;
    req.context.tenantCode = tenant.tenantCode;
    req.context.tenantSchema = tenant.schemaName;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireTenantContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.context.tenantId || !req.context.tenantSchema) {
    return next(
      new HttpError(
        "Tenant context missing. Provide x-tenant-id header or tenant subdomain.",
        StatusCodes.BAD_REQUEST,
      ),
    );
  }

  return next();
};
