import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService } from "../services/authService";
import { HttpError } from "../utils/httpError";

export class AuthController {
  static async registerTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessName, tenantCode, adminName, adminEmail, password } = req.body ?? {};
      if (!businessName || !tenantCode || !adminName || !adminEmail || !password) {
        throw new HttpError("Missing required fields", StatusCodes.BAD_REQUEST);
      }

      const result = await AuthService.registerTenant({
        businessName,
        tenantCode,
        adminName,
        adminEmail,
        password,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantCode, email, password } = req.body ?? {};
      if (!tenantCode || !email || !password) {
        throw new HttpError("Missing required fields", StatusCodes.BAD_REQUEST);
      }

      const result = await AuthService.login({ tenantCode, email, password });
      res.status(StatusCodes.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static me(req: Request, res: Response): void {
    res.status(StatusCodes.OK).json({
      success: true,
      data: req.auth,
    });
  }
}
