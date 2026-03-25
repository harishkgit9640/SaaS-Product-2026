import { app } from "./app";
import { dbPool } from "./config/db";
import { env } from "./config/env";
import { startJobScheduler } from "./jobs/jobScheduler";
import { logger } from "./utils/logger";

const startServer = async (): Promise<void> => {
  try {
    await dbPool.query("SELECT 1");
    logger.info("Database connection established");

    app.listen(env.app.port, () => {
      logger.info(`Server started on port ${env.app.port} in ${env.app.nodeEnv} mode`);
      startJobScheduler();
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

void startServer();
