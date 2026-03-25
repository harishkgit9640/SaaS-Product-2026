import { NextFunction, Request, Response } from "express";

export interface RequestContext {
  requestId: string;
  tenantId?: string;
  tenantCode?: string;
  tenantSchema?: string;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

const generateRequestId = (): string =>
  `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const requestContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  req.context = {
    requestId: generateRequestId(),
  };
  next();
};
