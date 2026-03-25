import { Router } from "express";
import { PlanController } from "../controllers/planController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const planRouter = Router();

planRouter.use(requireTenantContextMiddleware, authMiddleware, requireRoles("Admin", "Member"));

planRouter.post("/", requireRoles("Admin"), PlanController.create);
planRouter.get("/", PlanController.list);
planRouter.get("/:id", PlanController.getById);
planRouter.put("/:id", requireRoles("Admin"), PlanController.update);
planRouter.delete("/:id", requireRoles("Admin"), PlanController.remove);
