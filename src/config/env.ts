import dotenv from "dotenv";
import { EnvConfig } from "../types/env";

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toNumber = (value: string, key: string): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${key}`);
  }
  return parsed;
};

const toBoolean = (value: string): boolean => value.toLowerCase() === "true";

export const env: EnvConfig = {
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: toNumber(process.env.PORT ?? "4000", "PORT"),
    bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS ?? "12", "BCRYPT_SALT_ROUNDS"),
    cronEnabled: toBoolean(process.env.CRON_ENABLED ?? "true"),
  },
  db: {
    host: required("DB_HOST"),
    port: toNumber(required("DB_PORT"), "DB_PORT"),
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    ssl: toBoolean(process.env.DB_SSL ?? "false"),
  },
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshSecret: required("JWT_REFRESH_SECRET"),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  razorpay: {
    keyId: required("RAZORPAY_KEY_ID"),
    keySecret: required("RAZORPAY_KEY_SECRET"),
    webhookSecret: required("RAZORPAY_WEBHOOK_SECRET"),
  },
  notifications: {
    emailEnabled: toBoolean(process.env.EMAIL_ENABLED ?? "true"),
    smtpHost: required("SMTP_HOST"),
    smtpPort: toNumber(process.env.SMTP_PORT ?? "587", "SMTP_PORT"),
    smtpSecure: toBoolean(process.env.SMTP_SECURE ?? "false"),
    smtpUser: required("SMTP_USER"),
    smtpPass: required("SMTP_PASS"),
    fromEmail: required("SMTP_FROM_EMAIL"),
    fromName: process.env.SMTP_FROM_NAME ?? "FeeAutomate",
  },
};
