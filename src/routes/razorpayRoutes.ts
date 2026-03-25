import { Router } from "express";
import { RazorpayController } from "../controllers/razorpayController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const razorpayRouter = Router();

razorpayRouter.use(requireTenantContextMiddleware, authMiddleware, requireRoles("Admin"));

razorpayRouter.post("/order", RazorpayController.createOrder);
razorpayRouter.post("/payment-link", RazorpayController.createPaymentLink);
