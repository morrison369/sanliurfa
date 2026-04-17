import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentDir = resolve(process.cwd(), 'src/components');

const files = [
  'ActivityFeed.astro',
  'ContentManager.astro',
  'ReportManager.astro',
  'UserSuggestionsPanel.astro',
  'WebhookManager.astro',
  'CollectionDetail.astro',
  'SearchResults.astro',
  'UserRecommendations.astro',
  'UserPublicProfile.astro',
  'WebhookAnalyticsDashboard.astro',
  'AdminVerificationQueue.astro',
  'BillingHistory.astro',
  'TransactionHistory.astro',
  'NotificationPreferencesManager.astro',
  'BusinessAnalyticsDashboard.astro',
  'SubscriptionAdminDashboard.astro',
  'NotificationCenter.astro',
  'NotificationsCenter.astro',
];

const violations: string[] = [];

for (const file of files) {
  const source = readFileSync(resolve(componentDir, file), 'utf8');
  if (!source.includes("import LoadingWrapper from './ui/LoadingWrapper.astro'")) {
    violations.push(`${file}: LoadingWrapper import bulunmuyor`);
  }
  const usesLoadingAttr =
    source.includes('loadingDataAttr=') || source.includes('dataAttributes={{');
  if (!usesLoadingAttr) {
    violations.push(`${file}: loading data attr kullanımı bulunmuyor`);
  }
}

if (violations.length > 0) {
  console.error('loading-wrapper-guard: ihlal bulundu');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`loading-wrapper-guard: OK (${files.length} wrapper)`);
