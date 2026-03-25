import { createLogger, format, transports } from "winston";

const isProduction = process.env.NODE_ENV === "production";

export const logger = createLogger({
  level: isProduction ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  defaultMeta: { service: "feeautomate-backend" },
  transports: [
    new transports.Console({
      format: isProduction
        ? format.json()
        : format.combine(format.colorize(), format.simple()),
    }),
  ],
});
