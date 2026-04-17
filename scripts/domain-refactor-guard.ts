import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type ShimSpec = {
  rootFile: string;
  targetFile: string;
  expectedExport: string;
};

const ROOT = process.cwd();

const SHIMS: ShimSpec[] = [
  { rootFile: 'src/lib/ui-copy.ts', targetFile: 'src/lib/shared/ui-copy.ts', expectedExport: "export * from './shared/ui-copy';" },
  { rootFile: 'src/lib/render-states.ts', targetFile: 'src/lib/shared/render-states.ts', expectedExport: "export * from './shared/render-states';" },
  { rootFile: 'src/lib/api-envelope.ts', targetFile: 'src/lib/shared/api-envelope.ts', expectedExport: "export * from './shared/api-envelope';" },
  { rootFile: 'src/lib/copy-hygiene.ts', targetFile: 'src/lib/shared/copy-hygiene.ts', expectedExport: "export * from './shared/copy-hygiene';" },
  { rootFile: 'src/lib/user-profile.ts', targetFile: 'src/lib/account/user-profile.ts', expectedExport: "export * from './account/user-profile';" },
  { rootFile: 'src/lib/user-settings.ts', targetFile: 'src/lib/account/user-settings.ts', expectedExport: "export * from './account/user-settings';" },
  { rootFile: 'src/lib/notification-preferences.ts', targetFile: 'src/lib/account/notification-preferences.ts', expectedExport: "export * from './account/notification-preferences';" },
  { rootFile: 'src/lib/subscription-manager.ts', targetFile: 'src/lib/subscription/subscription-manager.ts', expectedExport: "export * from './subscription/subscription-manager';" },
  { rootFile: 'src/lib/billing-history.ts', targetFile: 'src/lib/subscription/billing-history.ts', expectedExport: "export * from './subscription/billing-history';" },
  { rootFile: 'src/lib/transaction-history.ts', targetFile: 'src/lib/subscription/transaction-history.ts', expectedExport: "export * from './subscription/transaction-history';" },
  { rootFile: 'src/lib/subscription-admin-dashboard.ts', targetFile: 'src/lib/subscription/subscription-admin-dashboard.ts', expectedExport: "export * from './subscription/subscription-admin-dashboard';" },
  { rootFile: 'src/lib/analytics-panel.ts', targetFile: 'src/lib/analytics/analytics-panel.ts', expectedExport: "export * from './analytics/analytics-panel';" },
  { rootFile: 'src/lib/business-analytics-dashboard.ts', targetFile: 'src/lib/analytics/business-analytics-dashboard.ts', expectedExport: "export * from './analytics/business-analytics-dashboard';" },
  { rootFile: 'src/lib/live-analytics-dashboard.ts', targetFile: 'src/lib/analytics/live-analytics-dashboard.ts', expectedExport: "export * from './analytics/live-analytics-dashboard';" },
  { rootFile: 'src/lib/webhook-analytics-dashboard.ts', targetFile: 'src/lib/analytics/webhook-analytics-dashboard.ts', expectedExport: "export * from './analytics/webhook-analytics-dashboard';" },
  { rootFile: 'src/lib/notifications-center.ts', targetFile: 'src/lib/social/notifications-center.ts', expectedExport: "export * from './social/notifications-center';" },
  { rootFile: 'src/lib/notification-center.ts', targetFile: 'src/lib/social/notification-center.ts', expectedExport: "export * from './social/notification-center';" },
  { rootFile: 'src/lib/activity-feed.ts', targetFile: 'src/lib/social/activity-feed.ts', expectedExport: "export * from './social/activity-feed';" },
  { rootFile: 'src/lib/messaging-inbox.ts', targetFile: 'src/lib/social/messaging-inbox.ts', expectedExport: "export * from './social/messaging-inbox';" },
  { rootFile: 'src/lib/user-recommendations.ts', targetFile: 'src/lib/social/user-recommendations.ts', expectedExport: "export * from './social/user-recommendations';" },
  { rootFile: 'src/lib/search-results.ts', targetFile: 'src/lib/discovery/search-results.ts', expectedExport: "export * from './discovery/search-results';" },
  { rootFile: 'src/lib/collections-manager.ts', targetFile: 'src/lib/discovery/collections-manager.ts', expectedExport: "export * from './discovery/collections-manager';" },
  { rootFile: 'src/lib/collection-detail.ts', targetFile: 'src/lib/discovery/collection-detail.ts', expectedExport: "export * from './discovery/collection-detail';" },
  { rootFile: 'src/lib/user-suggestions-panel.ts', targetFile: 'src/lib/discovery/user-suggestions-panel.ts', expectedExport: "export * from './discovery/user-suggestions-panel';" },
  { rootFile: 'src/lib/hashtag-explorer.ts', targetFile: 'src/lib/discovery/hashtag-explorer.ts', expectedExport: "export * from './discovery/hashtag-explorer';" },
  { rootFile: 'src/lib/admin-dashboard-overview.ts', targetFile: 'src/lib/admin/admin-dashboard-overview.ts', expectedExport: "export * from './admin/admin-dashboard-overview';" },
  { rootFile: 'src/lib/admin-performance-dashboard.ts', targetFile: 'src/lib/admin/admin-performance-dashboard.ts', expectedExport: "export * from './admin/admin-performance-dashboard';" },
  { rootFile: 'src/lib/admin-loyalty-panel.ts', targetFile: 'src/lib/admin/admin-loyalty-panel.ts', expectedExport: "export * from './admin/admin-loyalty-panel';" },
  { rootFile: 'src/lib/admin-verification-queue.ts', targetFile: 'src/lib/admin/admin-verification-queue.ts', expectedExport: "export * from './admin/admin-verification-queue';" },
  { rootFile: 'src/lib/report-manager.ts', targetFile: 'src/lib/admin/report-manager.ts', expectedExport: "export * from './admin/report-manager';" },
  { rootFile: 'src/lib/content-manager-ui.ts', targetFile: 'src/lib/content/content-manager-ui.ts', expectedExport: "export * from './content/content-manager-ui';" },
  { rootFile: 'src/lib/featured-listings-manager.ts', targetFile: 'src/lib/content/featured-listings-manager.ts', expectedExport: "export * from './content/featured-listings-manager';" },
  { rootFile: 'src/lib/marketing-campaign-builder.ts', targetFile: 'src/lib/content/marketing-campaign-builder.ts', expectedExport: "export * from './content/marketing-campaign-builder';" },
  { rootFile: 'src/lib/blog.ts', targetFile: 'src/lib/content/blog.ts', expectedExport: "export * from './content/blog';" },
  { rootFile: 'src/lib/blog-webhooks.ts', targetFile: 'src/lib/content/blog-webhooks.ts', expectedExport: "export * from './content/blog-webhooks';" },
  { rootFile: 'src/lib/vendor-dashboard.ts', targetFile: 'src/lib/vendor/vendor-dashboard.ts', expectedExport: "export * from './vendor/vendor-dashboard';" },
];

function readNormalizedFile(filePath: string): string {
  return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim();
}

function absolute(relativePath: string): string {
  return path.join(ROOT, relativePath);
}

const failures: string[] = [];

for (const shim of SHIMS) {
  const rootPath = absolute(shim.rootFile);
  const targetPath = absolute(shim.targetFile);

  if (!existsSync(rootPath)) {
    failures.push(`Eksik root shim: ${shim.rootFile}`);
    continue;
  }

  if (!existsSync(targetPath)) {
    failures.push(`Eksik domain hedefi: ${shim.targetFile}`);
    continue;
  }

  const actual = readNormalizedFile(rootPath);
  if (actual !== shim.expectedExport) {
    failures.push(`Shim bozuldu: ${shim.rootFile}`);
  }
}

if (failures.length > 0) {
  console.error('domain-refactor-guard: FAIL');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`domain-refactor-guard: OK (${SHIMS.length} shim)`);
