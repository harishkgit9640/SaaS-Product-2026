import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authMiddleware, requireRoles } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register-tenant", AuthController.registerTenant);
authRouter.post("/login", AuthController.login);

authRouter.get("/me", authMiddleware, AuthController.me);
authRouter.get("/admin-only", authMiddleware, requireRoles("Admin"), AuthController.me);
