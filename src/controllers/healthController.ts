import { Request, Response } from "express";

export class HealthController {
  static getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: {
        service: "feeautomate-backend",
        status: "ok",
      },
    });
  }
}
