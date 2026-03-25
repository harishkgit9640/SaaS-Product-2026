import { Router } from "express";
import { MemberController } from "../controllers/memberController";
import { authMiddleware, requireRoles } from "../middleware/auth";
import { requireTenantContextMiddleware } from "../middleware/tenantResolver";

export const memberRouter = Router();

memberRouter.use(requireTenantContextMiddleware, authMiddleware, requireRoles("Admin", "Member"));

memberRouter.post("/", MemberController.create);
memberRouter.get("/", MemberController.list);
memberRouter.get("/:id", MemberController.getById);
memberRouter.put("/:id", MemberController.update);
memberRouter.delete("/:id", requireRoles("Admin"), MemberController.remove);
