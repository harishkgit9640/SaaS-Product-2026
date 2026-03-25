import { Router } from "express";
import { PaymentController } from "../controllers/paymentController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const paymentRouter = Router();

paymentRouter.use(requireTenantContextMiddleware, authMiddleware, requireRoles("Admin", "Member"));

paymentRouter.post("/", requireRoles("Admin"), PaymentController.create);
paymentRouter.get("/", PaymentController.listByInvoice);
paymentRouter.patch("/:id/status", requireRoles("Admin"), PaymentController.updateStatus);
