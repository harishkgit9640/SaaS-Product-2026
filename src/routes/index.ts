import { Router } from "express";
import { authRouter } from "./authRoutes";
import { HealthController } from "../controllers/healthController";
import { invoiceRouter } from "./invoiceRoutes";
import { memberRouter } from "./memberRoutes";
import { paymentRouter } from "./paymentRoutes";
import { planRouter } from "./planRoutes";
import { razorpayRouter } from "./razorpayRoutes";
import { subscriptionRouter } from "./subscriptionRoutes";
import { tenantRouter } from "./tenantRoutes";

export const apiRouter = Router();

apiRouter.get("/health", HealthController.getHealth);
apiRouter.use("/auth", authRouter);
apiRouter.use("/tenant", tenantRouter);
apiRouter.use("/members", memberRouter);
apiRouter.use("/plans", planRouter);
apiRouter.use("/subscriptions", subscriptionRouter);
apiRouter.use("/invoices", invoiceRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/razorpay", razorpayRouter);
