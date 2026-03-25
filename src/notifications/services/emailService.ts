import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: env.notifications.smtpHost,
  port: env.notifications.smtpPort,
  secure: env.notifications.smtpSecure,
  auth: {
    user: env.notifications.smtpUser,
    pass: env.notifications.smtpPass,
  },
});

export class EmailService {
  static async send(input: SendEmailInput): Promise<void> {
    if (!env.notifications.emailEnabled) {
      return;
    }

    try {
      await transporter.sendMail({
        from: `"${env.notifications.fromName}" <${env.notifications.fromEmail}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
    } catch (error) {
      logger.error("Email delivery failed", { to: input.to, subject: input.subject, error });
    }
  }
}
