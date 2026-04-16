import {
  buildAdminAccessCoverageReportUrl,
  fetchAdminAccessCoverageReport,
  fetchAdminPerformanceOptimization,
} from './admin-browser-client';
import type { RuntimeStatus } from './admin-ops-pages';

export interface RuntimeMonitorEndpoint {
  key: string;
  url: string;
  outputId: string;
  badgeId: string;
  summaryId?: string;
  load: () => Promise<unknown>;
  pickStatus: (payload: any) => RuntimeStatus;
  summarize?: (payload: any) => string;
}

export const runtimeMonitorBadgeStyles: Record<RuntimeStatus, string> = {
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export function buildRuntimeMonitorSummaryTone(status: RuntimeStatus): string {
  return status === 'blocked'
    ? 'mt-4 text-xs text-red-600 dark:text-red-300 font-semibold'
    : status === 'degraded'
      ? 'mt-4 text-xs text-amber-600 dark:text-amber-300 font-semibold'
      : 'mt-4 text-xs text-gray-500 dark:text-gray-400';
}

export function buildAccessCoverageSummary(payload: any): string {
  const report = payload?.data?.report;
  const firstDrift = report?.driftedFiles?.[0] ?? 'yok';
  return `Coverage %${report?.coveragePercent ?? 'yok'} • Drift ${report?.driftCount ?? 'yok'} • İlk dosya: ${firstDrift}`;
}

export function buildRuntimeMonitorEndpoints(fetchJson: (url: string) => Promise<any>): RuntimeMonitorEndpoint[] {
  return [
    {
      key: 'health',
      url: '/api/health',
      outputId: 'health-output',
      badgeId: 'health-badge',
      load: () => fetchJson('/api/health'),
      pickStatus: (payload) => payload?.data?.status ?? 'blocked',
    },
    {
      key: 'health-detailed',
      url: '/api/health/detailed',
      outputId: 'health-detailed-output',
      badgeId: 'health-detailed-badge',
      load: () => fetchJson('/api/health/detailed'),
      pickStatus: (payload) => payload?.data?.status ?? 'blocked',
    },
    {
      key: 'performance',
      url: '/api/performance',
      outputId: 'performance-output',
      badgeId: 'performance-badge',
      load: () => fetchJson('/api/performance'),
      pickStatus: (payload) => payload?.data?.serviceLevelObjectives?.webhookIngestion?.status ?? 'blocked',
    },
    {
      key: 'optimization',
      url: '/api/admin/performance/optimization',
      outputId: 'optimization-output',
      badgeId: 'optimization-badge',
      load: () => fetchAdminPerformanceOptimization(),
      pickStatus: (payload) => payload?.artifactHealthSummary?.overall ?? 'blocked',
    },
    {
      key: 'admin-access-coverage',
      url: '/api/admin/system/admin-access-coverage',
      outputId: 'admin-access-coverage-output',
      badgeId: 'admin-access-coverage-badge',
      summaryId: 'admin-access-coverage-summary',
      load: () => fetchAdminAccessCoverageReport(),
      pickStatus: (payload) => payload?.data?.artifact?.status ?? 'blocked',
      summarize: buildAccessCoverageSummary,
    },
  ];
}

export function applyRuntimeMonitorCoverageLinks() {
  return {
    json: buildAdminAccessCoverageReportUrl('json'),
    markdown: buildAdminAccessCoverageReportUrl('markdown'),
  };
}
