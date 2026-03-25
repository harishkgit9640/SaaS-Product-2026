import cron from "node-cron";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { runForAllTenants } from "./utils/tenantJobRunner";
import { DefaulterDetectionJobService } from "./services/defaulterDetectionJobService";
import { MonthlyInvoiceJobService } from "./services/monthlyInvoiceJobService";
import { PaymentReminderJobService } from "./services/paymentReminderJobService";
import { ReceiptGenerationJobService } from "./services/receiptGenerationJobService";
import { SubscriptionRenewalReminderJobService } from "./services/subscriptionRenewalReminderJobService";

const runSafely = async (jobName: string, jobRunner: () => Promise<void>): Promise<void> => {
  try {
    await jobRunner();
    logger.info("Cron job completed", { jobName });
  } catch (error) {
    logger.error("Cron job failed", { jobName, error });
  }
};

export const startJobScheduler = (): void => {
  if (!env.app.cronEnabled) {
    logger.warn("Cron scheduler disabled via environment");
    return;
  }

  // 1) Monthly invoice generation: midnight on day 1 each month
  cron.schedule("0 0 1 * *", () => {
    void runSafely("monthly-invoice-generation", async () => {
      await runForAllTenants("monthly-invoice-generation", MonthlyInvoiceJobService.runForTenant);
    });
  });

  // 2) Payment reminders: daily at 09:00 UTC (before/on/after due)
  cron.schedule("0 9 * * *", () => {
    void runSafely("payment-reminders", async () => {
      await runForAllTenants("payment-reminders", PaymentReminderJobService.runForTenant);
    });
  });

  // 3) Defaulter detection: daily at 01:30 UTC
  cron.schedule("30 1 * * *", () => {
    void runSafely("defaulter-detection", async () => {
      await runForAllTenants("defaulter-detection", DefaulterDetectionJobService.runForTenant);
    });
  });

  // 4) Receipt generation: every hour
  cron.schedule("0 * * * *", () => {
    void runSafely("receipt-generation", async () => {
      await runForAllTenants("receipt-generation", ReceiptGenerationJobService.runForTenant);
    });
  });

  // 5) Subscription renewal reminders: daily at 08:00 UTC
  cron.schedule("0 8 * * *", () => {
    void runSafely("subscription-renewal-reminder", async () => {
      await runForAllTenants(
        "subscription-renewal-reminder",
        SubscriptionRenewalReminderJobService.runForTenant,
      );
    });
  });

  logger.info("Cron scheduler started");
};
