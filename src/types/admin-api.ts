import type { AdminStatusLevel } from '../lib/admin-status';

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

export interface AdminDashboardOverviewData {
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

