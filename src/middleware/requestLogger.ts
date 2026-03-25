import morgan from "morgan";
import { logger } from "../utils/logger";

export const requestLoggerMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: {
      write: (message: string): void => {
        logger.info(message.trim());
      },
    },
  },
);
