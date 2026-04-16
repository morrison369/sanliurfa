import type { AdminStatusLevel } from '../lib/admin-status';
import type { paths } from './generated-admin-api';

type DashboardOverviewResponse =
  paths['/api/admin/dashboard/overview']['get']['responses']['200']['content']['application/json'];
type SystemMetricsResponse =
  paths['/api/admin/system/metrics']['get']['responses']['200']['content']['application/json'];
type DeploymentStatusResponse =
  paths['/api/admin/deployment/status']['get']['responses']['200']['content']['application/json'];
type ArtifactHealthResponse =
  paths['/api/admin/system/artifact-health']['get']['responses']['200']['content']['application/json'];
type SubscriptionUsersGetResponse =
  paths['/api/admin/subscriptions/users']['get']['responses']['200']['content']['application/json'];
type SubscriptionAnalyticsGetResponse =
  paths['/api/admin/subscriptions/analytics']['get']['responses']['200']['content']['application/json'];
type AdminAnalyticsGetResponse =
  paths['/api/admin/analytics']['get']['responses']['200']['content']['application/json'];
type ReleaseGateSummaryGetResponse =
  paths['/api/admin/system/release-gate-summary']['get']['responses']['200']['content']['application/json'];
type SubscriptionUsersPostResponse =
  paths['/api/admin/subscriptions/users']['post']['responses']['200']['content']['application/json'];
type MessageStatusPostResponse =
  paths['/api/admin/messages/{id}/status']['post']['responses']['200']['content']['application/json'];
type AuditLogsResponse =
  paths['/api/admin/audit-logs']['get']['responses']['200']['content']['application/json'];
type PerformanceOptimizationResponse =
  paths['/api/admin/performance/optimization']['get']['responses']['200']['content']['application/json'];
type VerificationsGetResponse =
  paths['/api/admin/verifications']['get']['responses']['200']['content']['application/json'];
type VerificationApprovePostResponse =
  paths['/api/admin/verifications/{id}/approve']['post']['responses']['200']['content']['application/json'];
type VerificationRejectPostResponse =
  paths['/api/admin/verifications/{id}/reject']['post']['responses']['200']['content']['application/json'];
type AdminUsersGetResponse =
  paths['/api/admin/users']['get']['responses']['200']['content']['application/json'];
type AdminUserGetResponse =
  paths['/api/admin/users/{id}']['get']['responses']['200']['content']['application/json'];
type AdminUserPostResponse =
  paths['/api/admin/users/{id}']['post']['responses']['200']['content']['application/json'];
type ModerationQueueGetResponse =
  paths['/api/admin/moderation/queue']['get']['responses']['200']['content']['application/json'];
type ModerationQueuePostResponse =
  paths['/api/admin/moderation/queue']['post']['responses']['200']['content']['application/json'];
type ModerationStatsGetResponse =
  paths['/api/admin/moderation/stats']['get']['responses']['200']['content']['application/json'];
type ModerationFlagsGetResponse =
  paths['/api/admin/moderation/flags']['get']['responses']['200']['content']['application/json'];
type ModerationFlagsPostResponse =
  paths['/api/admin/moderation/flags']['post']['responses']['200']['content']['application/json'];
type ModerationActionsGetResponse =
  paths['/api/admin/moderation/actions']['get']['responses']['200']['content']['application/json'];
type ModerationActionsPostResponse =
  paths['/api/admin/moderation/actions']['post']['responses']['201']['content']['application/json'];
type ModerationReportsGetResponse =
  paths['/api/admin/moderation/reports']['get']['responses']['200']['content']['application/json'];
type ModerationReportsPutResponse =
  paths['/api/admin/moderation/reports']['put']['responses']['200']['content']['application/json'];

export interface IntegrationVerificationState {
  status: string;
  message: string;
  checkedAt: string;
}

export interface PerformanceOptimizationSummary {
  generatedAt: string;
  recommendations: {
    total: number;
    highPriority: number;
    mediumPriority: number;
  };
  metrics: {
    slowQueriesCount: number;
    slowRequestRate: number;
    cacheHitRate: number;
    avgRequestDuration: number;
    p95Duration: number;
  };
  cacheStrategies: {
    count: number;
  };
  indexSuggestions: {
    count: number;
    top: string[];
  };
  slowOperations: Array<{
    type: string;
    message: string;
    duration: number;
    timestamp: string;
  }>;
}

export interface ReleaseGateSummary {
  available: boolean;
  generatedAt: string | null;
  finalStatus: 'passed' | 'failed' | 'missing';
  blockingFailedSteps: string[];
  advisoryFailedSteps: string[];
  failedStepCount: number;
  steps?: Array<{
    step: string;
    command: string;
    advisory: boolean;
    status: 'passed' | 'failed';
  }>;
  performanceOptimization?: {
    recommendations: { total: number; highPriority: number; mediumPriority: number };
    metrics: { slowRequestRate: number; cacheHitRate: number };
  } | null;
}

export interface NightlySummary {
  available: boolean;
  kind: 'regression' | 'e2e';
  generatedAt: string | null;
  outcome: string;
  successRatePercent: number | null;
  recentOutcomes: string[];
  topFailures: string[];
  performanceOptimization?: {
    recommendations: { total: number; highPriority: number; mediumPriority: number };
    metrics: { slowRequestRate: number; cacheHitRate: number };
  } | null;
}

export interface ArtifactHealthEntry {
  available: boolean;
  generatedAt: string | null;
  status: AdminStatusLevel;
}

export interface ArtifactHealthSummary {
  overall: AdminStatusLevel;
  healthyCount: number;
  degradedCount: number;
  blockedCount: number;
  total: number;
}

export interface AdminOpsAuditSummary {
  generatedAt: string;
  windowHours: number;
  total: number;
  deniedCount: number;
  rateLimitedCount: number;
  writeCount: number;
  readCount: number;
  lastDeniedAt: string | null;
}

export interface AdminDashboardOverviewData extends DashboardOverviewResponse['data']['data'] {
  metrics: SystemMetricsResponse['data']['data'];
}

export type AdminSystemMetricsData = SystemMetricsResponse['data']['data'];
export type AdminDeploymentStatusData = DeploymentStatusResponse['data']['data'];
export type AdminArtifactHealthData = ArtifactHealthResponse['data']['data'];
export type AdminDashboardOverviewResponseData = DashboardOverviewResponse['data'];
export type AdminSubscriptionUsersListData = SubscriptionUsersGetResponse['data'];
export type AdminSubscriptionAnalyticsData = SubscriptionAnalyticsGetResponse['data'];
export type AdminAnalyticsData = AdminAnalyticsGetResponse['data'];
export type AdminReleaseGateSummaryData = ReleaseGateSummaryGetResponse['data'];
export type AdminSubscriptionUsersMutationData = SubscriptionUsersPostResponse['data'];
export type AdminMessageStatusMutationData = MessageStatusPostResponse['data'];
export type AdminAuditLogsData = AuditLogsResponse['data'];
export type AdminPerformanceOptimizationData = PerformanceOptimizationResponse['data']['data'];
export type AdminVerificationsListData = VerificationsGetResponse['data'];
export type AdminVerificationApproveData = VerificationApprovePostResponse['data'];
export type AdminVerificationRejectData = VerificationRejectPostResponse['data'];
export type AdminUsersListData = AdminUsersGetResponse['data'];
export type AdminUserDetailsData = AdminUserGetResponse['data'];
export type AdminUserMutationData = AdminUserPostResponse['data'];
export type AdminModerationQueueListData = ModerationQueueGetResponse['data'];
export type AdminModerationQueueMutationData = ModerationQueuePostResponse['data'];
export type AdminModerationStatsData = ModerationStatsGetResponse['data'];
export type AdminModerationFlagsData = ModerationFlagsGetResponse['data'];
export type AdminModerationFlagMutationData = ModerationFlagsPostResponse['data'];
export type AdminModerationActionsData = ModerationActionsGetResponse['data'];
export type AdminModerationActionMutationData = ModerationActionsPostResponse['data'];
export type AdminModerationReportsData = ModerationReportsGetResponse['data'];
export type AdminModerationReportMutationData = ModerationReportsPutResponse['data'];

export interface AdminDashboardOverviewLegacyShape {
  overview: {
    users: { total: number; new: number; active: number };
    content: { places: number; reviews: number; comments: number; newReviews: number };
    flags: { pending: number; resolved: number; total: number };
    moderation: { totalActions: number; warnings: number; suspensions: number; bans: number };
    period: number;
  };
  metrics: unknown;
  moderation: {
    queue: { pending: number; inReview: number };
    flags: { highSeverity: number };
    actions: { suspensions: number };
  };
  integrations: {
    resend: { configured: boolean; source: 'env' | 'admin' | 'none' };
    analytics: { configured: boolean; source: 'env' | 'admin' | 'none' };
    summary?: { configuredCount: number; total: number; fullyConfigured: boolean };
    verification?: {
      resend: IntegrationVerificationState;
      analytics: IntegrationVerificationState;
      summary: { healthy: boolean; checkedAt: string };
    };
  };
  operational?: {
    oauth: {
      callback: { errorRatePercent: number; sampleSize: number };
    };
    webhook: {
      stripe: { errorRatePercent: number; p95DurationMs: number; duplicateRatePercent?: number; sampleSize: number };
    };
    search: {
      periodDays: number;
      totalTopSearches: number;
      topQueries: Array<{ query: string; count: number }>;
    };
  };
  performanceOptimization?: PerformanceOptimizationSummary;
  adminOpsAudit?: AdminOpsAuditSummary;
  artifactHealth?: {
    releaseGate: ArtifactHealthEntry;
    nightlyRegression: ArtifactHealthEntry;
    nightlyE2E: ArtifactHealthEntry;
    performanceOps: ArtifactHealthEntry;
  };
  artifactHealthSummary?: ArtifactHealthSummary;
  releaseGate?: ReleaseGateSummary;
  nightly?: {
    regression: NightlySummary & { kind: 'regression' };
    e2e: NightlySummary & { kind: 'e2e' };
  };
  statusSummary?: {
    integrations: AdminStatusLevel;
    regression: AdminStatusLevel;
    e2e: AdminStatusLevel;
    releaseGate: AdminStatusLevel;
    overall: AdminStatusLevel;
  };
}
