import express from "express";
import helmet from "helmet";
import { apiRouter } from "./routes";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middleware/errorHandler";
import { requestContextMiddleware } from "./middleware/requestContext";
import { requestLoggerMiddleware } from "./middleware/requestLogger";
import { tenantResolverMiddleware } from "./middleware/tenantResolver";
import { webhookRouter } from "./routes/webhookRoutes";

export const app = express();

app.use(helmet());
app.use("/api/v1/webhooks", webhookRouter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(requestContextMiddleware);
app.use(requestLoggerMiddleware);
app.use(tenantResolverMiddleware);

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
