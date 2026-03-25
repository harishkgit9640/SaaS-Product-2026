import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new HttpError(`Route not found: ${req.method} ${req.path}`, StatusCodes.NOT_FOUND));
};

export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isHttpError = err instanceof HttpError;
  const statusCode = isHttpError ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const message = isHttpError ? err.message : "Internal Server Error";

  logger.error("Unhandled request error", {
    requestId: req.context?.requestId,
    tenantId: req.context?.tenantId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      requestId: req.context?.requestId,
      ...(env.app.nodeEnv !== "production" ? { details: err.message } : {}),
    },
  });
};
