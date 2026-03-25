import { TenantRecord, TenantRepository } from "../../repositories/tenantRepository";
import { logger } from "../../utils/logger";

const DEFAULT_BATCH_SIZE = 20;

export const runForAllTenants = async (
  jobName: string,
  tenantWorker: (tenant: TenantRecord) => Promise<void>,
): Promise<void> => {
  const tenants = await TenantRepository.listActive();
  logger.info("Starting tenant job run", { jobName, tenantCount: tenants.length });

  for (let i = 0; i < tenants.length; i += DEFAULT_BATCH_SIZE) {
    const batch = tenants.slice(i, i + DEFAULT_BATCH_SIZE);
    await Promise.all(
      batch.map(async (tenant) => {
        try {
          await tenantWorker(tenant);
        } catch (error) {
          logger.error("Tenant job execution failed", {
            jobName,
            tenantId: tenant.id,
            tenantCode: tenant.tenantCode,
            error,
          });
        }
      }),
    );
  }

  logger.info("Finished tenant job run", { jobName, tenantCount: tenants.length });
};
