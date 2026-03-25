import { Router } from "express";
import { SubscriptionController } from "../controllers/subscriptionController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const subscriptionRouter = Router();

subscriptionRouter.use(
  requireTenantContextMiddleware,
  authMiddleware,
  requireRoles("Admin", "Member"),
);

subscriptionRouter.post("/", SubscriptionController.create);
subscriptionRouter.get("/", SubscriptionController.list);
subscriptionRouter.get("/:id", SubscriptionController.getById);
subscriptionRouter.put("/:id", SubscriptionController.update);
subscriptionRouter.delete("/:id", requireRoles("Admin"), SubscriptionController.remove);
