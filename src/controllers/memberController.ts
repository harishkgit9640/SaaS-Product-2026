import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MemberService } from "../services/memberService";
import { HttpError } from "../utils/httpError";

export class MemberController {
  private static getIdParam(req: Request): string {
    const idParam = req.params.id;
    return Array.isArray(idParam) ? idParam[0] : idParam;
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, status } = req.body ?? {};
      if (!fullName || !email) {
        throw new HttpError("fullName and email are required", StatusCodes.BAD_REQUEST);
      }
      const tenantSchema = req.context.tenantSchema!;
      const member = await MemberService.create(tenantSchema, { fullName, email, status });
      res.status(StatusCodes.CREATED).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const members = await MemberService.list(tenantSchema);
      res.status(StatusCodes.OK).json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const member = await MemberService.getById(tenantSchema, this.getIdParam(req));
      res.status(StatusCodes.OK).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      const member = await MemberService.update(tenantSchema, this.getIdParam(req), req.body ?? {});
      res.status(StatusCodes.OK).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantSchema = req.context.tenantSchema!;
      await MemberService.remove(tenantSchema, this.getIdParam(req));
      res.status(StatusCodes.OK).json({ success: true, message: "Member deleted" });
    } catch (error) {
      next(error);
    }
  }
}
