import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { apiRouter } from "./routes";
import { swaggerDocument } from "./docs/swagger";
import { env } from "./config/env";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middleware/errorHandler";
import { requestContextMiddleware } from "./middleware/requestContext";
import { requestLoggerMiddleware } from "./middleware/requestLogger";
import { tenantResolverMiddleware } from "./middleware/tenantResolver";
import { webhookRouter } from "./routes/webhookRoutes";

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: env.app.nodeEnv === "production"
    ? [/\.feeautomate\.com$/]
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.app.nodeEnv === "production" ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many requests, please try again later." } },
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "FeeAutomate API Docs",
}));

app.use("/api/v1/webhooks", webhookRouter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(requestContextMiddleware);
app.use(requestLoggerMiddleware);
app.use(tenantResolverMiddleware);

app.use("/api/v1", apiLimiter, apiRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
