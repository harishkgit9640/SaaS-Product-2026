import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthenticatedUser, UserRole } from "../types/auth";
import { HttpError } from "../utils/httpError";
import { verifyAccessToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new HttpError("Unauthorized", StatusCodes.UNAUTHORIZED));
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(token);
    if (req.context.tenantId && payload.tenantId !== req.context.tenantId) {
      return next(new HttpError("Token tenant mismatch", StatusCodes.FORBIDDEN));
    }

    req.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return next(new HttpError("Invalid token", StatusCodes.UNAUTHORIZED, error));
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      return next(new HttpError("Unauthorized", StatusCodes.UNAUTHORIZED));
    }

    if (!roles.includes(req.auth.role)) {
      return next(new HttpError("Forbidden", StatusCodes.FORBIDDEN));
    }

    return next();
  };
};
