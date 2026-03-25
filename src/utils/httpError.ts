import { StatusCodes } from "http-status-codes";

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}
