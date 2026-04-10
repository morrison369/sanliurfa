import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanupAdminOpsAuditEntries, getAdminOpsAuditPath } from '../src/lib/admin-ops-audit';

const REPORT_RETENTION_DAYS = 14;
const ADMIN_OPS_AUDIT_RETENTION_DAYS = 30;

function cleanupArchivedReports(): string[] {
  const reportsDir = resolve(process.cwd(), 'docs', 'reports');
  if (!existsSync(reportsDir)) {
    return [];
  }

  const cutoff = Date.now() - REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const removed: string[] = [];
  for (const fileName of readdirSync(reportsDir)) {
    if (!/summary-\d{4}-\d{2}-\d{2}t/i.test(fileName) && !/nightly-.*\.log$/i.test(fileName)) {
      continue;
    }

    const filePath = resolve(reportsDir, fileName);
    const modifiedAt = statSync(filePath).mtimeMs;
    if (modifiedAt < cutoff) {
      rmSync(filePath, { force: true });
      removed.push(fileName);
    }
  }

  return removed;
}

async function main(): Promise<void> {
  mkdirSync(resolve(process.cwd(), 'docs', 'reports'), { recursive: true });
  const retainedAuditEntries = cleanupAdminOpsAuditEntries(ADMIN_OPS_AUDIT_RETENTION_DAYS);
  const removedReports = cleanupArchivedReports();

  console.log(
    JSON.stringify(
      {
        adminOpsAuditPath: getAdminOpsAuditPath(),
        adminOpsAuditRetentionDays: ADMIN_OPS_AUDIT_RETENTION_DAYS,
        retainedAuditEntries,
        reportRetentionDays: REPORT_RETENTION_DAYS,
        removedReports,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
