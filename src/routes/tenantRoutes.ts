import { Router } from "express";
import { TenantController } from "../controllers/tenantController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const tenantRouter = Router();

tenantRouter.get(
  "/users",
  requireTenantContextMiddleware,
  authMiddleware,
  requireRoles("Admin", "Member"),
  TenantController.listUsers,
);
