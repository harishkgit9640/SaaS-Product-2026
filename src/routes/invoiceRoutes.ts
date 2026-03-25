import { Router } from "express";
import { InvoiceController } from "../controllers/invoiceController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const invoiceRouter = Router();

invoiceRouter.use(requireTenantContextMiddleware, authMiddleware, requireRoles("Admin", "Member"));

invoiceRouter.post("/", requireRoles("Admin"), InvoiceController.create);
invoiceRouter.get("/", InvoiceController.list);
