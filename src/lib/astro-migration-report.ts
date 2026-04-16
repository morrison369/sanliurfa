export type HydrationRisk = 'low' | 'medium' | 'high';

export interface AstroHydrationEntry {
  pagePath: string;
  componentName: string;
  directive: 'load' | 'idle' | 'visible' | 'media' | 'only';
  risk: HydrationRisk;
  rationale: string;
}

export interface AstroHydrationInventoryReport {
  generatedAt: string;
  astroFiles: number;
  tsxFiles: number;
  totalHydrationPoints: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  entries: AstroHydrationEntry[];
}

const HIGH_RISK_COMPONENTS = new Set([
  'AdminAnalyticsDashboard',
  'AdminDashboardOverview',
  'AdminManager',
  'AdminPerformanceDashboard',
  'AdminVerificationQueue',
  'ActivityFeed',
  'AnalyticsPanel',
  'LiveAnalyticsDashboard',
  'MessagingInbox',
  'ModerationDashboard',
  'ModerationQueueManager',
  'OLAPExplorer',
  'SubscriptionAdminDashboard',
  'WebhookAnalyticsDashboard',
  'WebhookManager',
]);

const MEDIUM_RISK_COMPONENTS = new Set([
  'AdminLoyaltyPanel',
  'AuditLogViewer',
  'BillingHistory',
  'BusinessAnalyticsDashboard',
  'CollectionDetail',
  'CollectionsManager',
  'ContentManager',
  'FeaturedListingsManager',
  'HashtagExplorer',
  'LoyaltyDashboard',
  'MarketingCampaignBuilder',
  'MyActivityLog',
  'NotificationCenter',
  'NotificationPreferencesManager',
  'NotificationsCenter',
  'ReportManager',
  'RewardsCatalog',
  'SearchResults',
  'SubscriptionManager',
  'UserProfile',
  'UserPublicProfile',
  'UserManagementTable',
  'UserSearchResults',
  'UserSettings',
  'UserSuggestionsPanel',
  'VendorDashboard',
]);

function getRiskRationale(componentName: string, risk: HydrationRisk): string {
  if (risk === 'high') {
    return `${componentName} yoğun state veya dashboard tipi davranış taşıyor.`;
  }

  if (risk === 'medium') {
    return `${componentName} form, liste veya orta seviyeli etkileşim içeriyor.`;
  }

  return `${componentName} küçük widget veya sınırlı davranış taşıyor.`;
}

export function classifyHydrationRisk(componentName: string): {
  risk: HydrationRisk;
  rationale: string;
} {
  if (HIGH_RISK_COMPONENTS.has(componentName)) {
    return { risk: 'high', rationale: getRiskRationale(componentName, 'high') };
  }

  if (MEDIUM_RISK_COMPONENTS.has(componentName)) {
    return { risk: 'medium', rationale: getRiskRationale(componentName, 'medium') };
  }

  return { risk: 'low', rationale: getRiskRationale(componentName, 'low') };
}

export function createAstroHydrationInventoryReport(options: {
  generatedAt?: string;
  astroFiles: number;
  tsxFiles: number;
  entries: Array<{
    pagePath: string;
    componentName: string;
    directive: 'load' | 'idle' | 'visible' | 'media' | 'only';
  }>;
}): AstroHydrationInventoryReport {
  const entries = options.entries
    .map((entry) => {
      const classification = classifyHydrationRisk(entry.componentName);
      return {
        ...entry,
        risk: classification.risk,
        rationale: classification.rationale,
      };
    })
    .sort((left, right) => {
      const riskWeight = { high: 0, medium: 1, low: 2 };
      return (
        riskWeight[left.risk] - riskWeight[right.risk] ||
        left.pagePath.localeCompare(right.pagePath) ||
        left.componentName.localeCompare(right.componentName)
      );
    });

  const lowRiskCount = entries.filter((entry) => entry.risk === 'low').length;
  const mediumRiskCount = entries.filter((entry) => entry.risk === 'medium').length;
  const highRiskCount = entries.filter((entry) => entry.risk === 'high').length;

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    astroFiles: options.astroFiles,
    tsxFiles: options.tsxFiles,
    totalHydrationPoints: entries.length,
    lowRiskCount,
    mediumRiskCount,
    highRiskCount,
    entries,
  };
}

export function buildAstroHydrationInventoryMarkdown(
  report: AstroHydrationInventoryReport,
): string {
  return [
    '# Astro Hydration Inventory',
    `- Generated at: ${report.generatedAt}`,
    `- Astro files: ${report.astroFiles}`,
    `- TSX files: ${report.tsxFiles}`,
    `- Total hydration points: ${report.totalHydrationPoints}`,
    `- Low risk: ${report.lowRiskCount}`,
    `- Medium risk: ${report.mediumRiskCount}`,
    `- High risk: ${report.highRiskCount}`,
    '',
    '## Entries',
    ...report.entries.map(
      (entry) =>
        `- [${entry.risk}] ${entry.pagePath} -> ${entry.componentName} (client:${entry.directive})`,
    ),
    '',
  ].join('\n');
}
