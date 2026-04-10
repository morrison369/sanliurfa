import React, { useState } from 'react';
import {
  classifyIntegrationStatus,
  classifyNightlyStatus,
  classifyReleaseGateStatus,
} from '../lib/admin-status';
import { AdminOpsAuditCard, ArtifactHealthCard, IntegrationVerificationCard, ModerationStatsCard, NightlyTrendCard, OperationalSnapshotCard, PerformanceOptimizationCard, ReleaseGateCard } from './admin-dashboard/DetailCards';
import { CoreMetricsGrid } from './admin-dashboard/CoreMetricsGrid';
import { useAdminDashboardOverview } from '../hooks/useAdminDashboardOverview';

export default function AdminDashboardOverview() {
  const [period, setPeriod] = useState(30);
  const { data, loading, error } = useAdminDashboardOverview(period);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-medium text-red-900">Hata</h3>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const integrationLevel = classifyIntegrationStatus({
    configuredCount: data.integrations?.summary?.configuredCount ?? 0,
    total: data.integrations?.summary?.total ?? 2,
    verificationHealthy: data.integrations?.verification?.summary?.healthy,
  });
  const releaseGateLevel = data.releaseGate ? classifyReleaseGateStatus(data.releaseGate) : 'blocked';
  const nightlyRegressionLevel = data.nightly ? classifyNightlyStatus(data.nightly.regression) : 'blocked';
  const nightlyE2eLevel = data.nightly ? classifyNightlyStatus(data.nightly.e2e) : 'blocked';

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90, 365].map((days) => (
          <button
            key={days}
            onClick={() => setPeriod(days)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              period === days ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {days === 7 ? '7 gün' : days === 30 ? '30 gün' : days === 90 ? '3 ay' : '1 yıl'}
          </button>
        ))}
      </div>

      <CoreMetricsGrid
        data={data}
        integrationLevel={integrationLevel}
        releaseGateLevel={releaseGateLevel}
        nightlyRegressionLevel={nightlyRegressionLevel}
        nightlyE2eLevel={nightlyE2eLevel}
      />
      <ModerationStatsCard moderation={data.moderation} />
      <OperationalSnapshotCard operational={data.operational} />
      <PerformanceOptimizationCard performanceOptimization={data.performanceOptimization} />
      <AdminOpsAuditCard adminOpsAudit={(data as any).adminOpsAudit} />
      <ArtifactHealthCard artifactHealth={data.artifactHealth} artifactHealthSummary={data.artifactHealthSummary} />
      <IntegrationVerificationCard verification={data.integrations?.verification} />
      <ReleaseGateCard releaseGate={data.releaseGate} releaseGateLevel={releaseGateLevel} />
      <NightlyTrendCard nightly={data.nightly} nightlyRegressionLevel={nightlyRegressionLevel} nightlyE2eLevel={nightlyE2eLevel} />
    </div>
  );
}
