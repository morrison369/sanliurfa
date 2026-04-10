import React from 'react';
import type { AdminStatusLevel } from '../../lib/admin-status';
import type { AdminDashboardOverviewData } from '../../types/admin-api';
import { cardClassName, statusTone } from './utils';

export function ModerationStatsCard({ moderation }: { moderation: AdminDashboardOverviewData['moderation'] }) {
  if (!moderation) return null;
  return (
    <div className={cardClassName()}>
      <h3 className="font-semibold text-gray-900 mb-4">Moderasyon İstatistikleri</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Beklemede" value={moderation.queue.pending} tone="text-orange-600" />
        <Metric label="İncelemede" value={moderation.queue.inReview} tone="text-blue-600" />
        <Metric label="Yüksek Önem Bayrakları" value={moderation.flags.highSeverity} tone="text-red-600" />
        <Metric label="Toplam Suspansyonlar" value={moderation.actions.suspensions} tone="text-purple-600" />
      </div>
    </div>
  );
}

export function OperationalSnapshotCard({ operational }: { operational?: AdminDashboardOverviewData['operational'] }) {
  if (!operational) return null;
  return (
    <div className={cardClassName()}>
      <h3 className="font-semibold text-gray-900 mb-4">Operasyon Özeti</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">OAuth Callback Hata</div>
          <div className="text-xl font-bold text-gray-900">%{operational.oauth.callback.errorRatePercent}</div>
          <div className="text-xs text-gray-500">Örnek: {operational.oauth.callback.sampleSize}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Stripe Webhook</div>
          <div className="text-xl font-bold text-gray-900">
            %{operational.webhook.stripe.errorRatePercent} / p95 {operational.webhook.stripe.p95DurationMs}ms
          </div>
          <div className="text-xs text-gray-500">
            Duplicate %{operational.webhook.stripe.duplicateRatePercent || 0} • Örnek: {operational.webhook.stripe.sampleSize}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Arama Trendi ({operational.search.periodDays} gün)</div>
          <div className="text-xl font-bold text-gray-900">{operational.search.totalTopSearches}</div>
          <div className="text-xs text-gray-500 truncate">
            {operational.search.topQueries?.[0]
              ? `${operational.search.topQueries[0].query} (${operational.search.topQueries[0].count})`
              : 'Veri yok'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PerformanceOptimizationCard({
  performanceOptimization,
}: {
  performanceOptimization?: AdminDashboardOverviewData['performanceOptimization'];
}) {
  if (!performanceOptimization) return null;
  return (
    <div className={cardClassName()}>
      <h3 className="font-semibold text-gray-900 mb-4">Performans Optimizasyonu</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Öneriler</div>
          <div className="text-xl font-bold text-gray-900">{performanceOptimization.recommendations.total}</div>
          <div className="text-xs text-gray-500">
            High: {performanceOptimization.recommendations.highPriority} • Medium: {performanceOptimization.recommendations.mediumPriority}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Yavaş Query / Request</div>
          <div className="text-xl font-bold text-gray-900">
            {performanceOptimization.metrics.slowQueriesCount} / %{performanceOptimization.metrics.slowRequestRate}
          </div>
          <div className="text-xs text-gray-500">
            Avg: {performanceOptimization.metrics.avgRequestDuration}ms • p95: {performanceOptimization.metrics.p95Duration}ms
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Cache / Index</div>
          <div className="text-xl font-bold text-gray-900">
            %{performanceOptimization.metrics.cacheHitRate} / {performanceOptimization.indexSuggestions.count}
          </div>
          <div className="text-xs text-gray-500">Strategy: {performanceOptimization.cacheStrategies.count}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Son Yavaş Operasyon</div>
          <div className="text-sm font-semibold text-gray-900">
            {performanceOptimization.slowOperations[0]
              ? `${performanceOptimization.slowOperations[0].type} • ${performanceOptimization.slowOperations[0].duration}ms`
              : 'yok'}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {performanceOptimization.slowOperations[0]?.message || 'Yavaş operasyon kaydı yok'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArtifactHealthCard({
  artifactHealth,
  artifactHealthSummary,
}: {
  artifactHealth?: AdminDashboardOverviewData['artifactHealth'];
  artifactHealthSummary?: AdminDashboardOverviewData['artifactHealthSummary'];
}) {
  if (!artifactHealth) return null;
  return (
    <div className={cardClassName()}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Artifact Health</h3>
          {artifactHealthSummary && (
            <div className="text-xs text-gray-500 mt-1">
              Healthy: {artifactHealthSummary.healthyCount} • Degraded: {artifactHealthSummary.degradedCount} • Blocked: {artifactHealthSummary.blockedCount}
            </div>
          )}
        </div>
        {artifactHealthSummary && (
          <div className={`text-sm font-semibold ${statusTone(artifactHealthSummary.overall)}`}>
            {artifactHealthSummary.overall}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ArtifactItem label="Release Gate" entry={artifactHealth.releaseGate} />
        <ArtifactItem label="Nightly Regression" entry={artifactHealth.nightlyRegression} />
        <ArtifactItem label="Nightly E2E" entry={artifactHealth.nightlyE2E} />
        <ArtifactItem label="Performance Ops" entry={artifactHealth.performanceOps} />
      </div>
    </div>
  );
}

export function IntegrationVerificationCard({
  verification,
}: {
  verification?: AdminDashboardOverviewData['integrations']['verification'];
}) {
  if (!verification) return null;
  return (
    <div className={cardClassName()}>
      <h3 className="font-semibold text-gray-900 mb-4">Entegrasyon Doğrulama</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">RESEND</div>
          <div className="text-xl font-bold text-gray-900">{verification.resend.status}</div>
          <div className="text-xs text-gray-500">{verification.resend.message}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Analytics</div>
          <div className="text-xl font-bold text-gray-900">{verification.analytics.status}</div>
          <div className="text-xs text-gray-500">{verification.analytics.message}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-3">Son kontrol: {verification.summary.checkedAt}</div>
    </div>
  );
}

export function ReleaseGateCard({
  releaseGate,
  releaseGateLevel,
}: {
  releaseGate?: AdminDashboardOverviewData['releaseGate'];
  releaseGateLevel: AdminStatusLevel;
}) {
  if (!releaseGate) return null;
  return (
    <div className={cardClassName()}>
      <h3 className="font-semibold text-gray-900 mb-4">Release Gate</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Durum</div>
          <div className={`text-xl font-bold ${statusTone(releaseGateLevel)}`}>{releaseGateLevel}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Hata Sayısı</div>
          <div className="text-xl font-bold text-gray-900">{releaseGate.failedStepCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Son Üretim</div>
          <div className="text-sm text-gray-900">{releaseGate.generatedAt || 'Henüz yok'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-3">
        Blocking: {releaseGate.blockingFailedSteps[0] || 'yok'} • Advisory: {releaseGate.advisoryFailedSteps[0] || 'yok'}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Perf: {releaseGate.performanceOptimization?.recommendations.total ?? 'yok'} öneri • Slow request %{releaseGate.performanceOptimization?.metrics.slowRequestRate ?? 'yok'} • Cache %{releaseGate.performanceOptimization?.metrics.cacheHitRate ?? 'yok'}
      </div>
      {releaseGate.steps && releaseGate.steps.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Step Detayları ({releaseGate.steps.length})
          </summary>
          <div className="mt-3 space-y-2">
            {releaseGate.steps.slice(0, 10).map((step) => (
              <div key={`${step.step}-${step.command}`} className="rounded-lg border border-gray-200 p-3 text-xs">
                <div className="font-medium text-gray-900">
                  {step.step} • {step.status} {step.advisory ? '(advisory)' : '(blocking)'}
                </div>
                <div className="mt-1 break-all text-gray-500">{step.command}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function NightlyTrendCard({
  nightly,
  nightlyRegressionLevel,
  nightlyE2eLevel,
}: {
  nightly?: AdminDashboardOverviewData['nightly'];
  nightlyRegressionLevel: AdminStatusLevel;
  nightlyE2eLevel: AdminStatusLevel;
}) {
  if (!nightly) return null;
  return (
    <div className={cardClassName()}>
      <h3 className="font-semibold text-gray-900 mb-4">Nightly Trend</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NightlyItem title="Regression" summary={nightly.regression} level={nightlyRegressionLevel} />
        <NightlyItem title="E2E" summary={nightly.e2e} level={nightlyE2eLevel} />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function ArtifactItem({
  label,
  entry,
}: {
  label: string;
  entry: NonNullable<AdminDashboardOverviewData['artifactHealth']>[keyof NonNullable<AdminDashboardOverviewData['artifactHealth']>];
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{entry.available ? 'var' : 'yok'}</div>
      <div className={`text-xs ${statusTone(entry.status)}`}>{entry.status}</div>
      <div className="text-xs text-gray-500">{entry.generatedAt || 'Henüz yok'}</div>
    </div>
  );
}

function NightlyItem({
  title,
  summary,
  level,
}: {
  title: string;
  summary: NonNullable<AdminDashboardOverviewData['nightly']>[keyof NonNullable<AdminDashboardOverviewData['nightly']>];
  level: AdminStatusLevel;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className={`text-xl font-bold ${statusTone(level)}`}>{level}</div>
      <div className="text-xs text-gray-500">
        Outcome: {summary.outcome} • Success rate: {summary.successRatePercent ?? 'yok'}%
      </div>
      <div className="text-xs text-gray-500">Son run: {summary.generatedAt || 'Henüz yok'}</div>
      <div className="text-xs text-gray-500 mt-2">Failure: {summary.topFailures[0] || 'yok'}</div>
      <div className="text-xs text-gray-500 mt-2">
        Perf: {summary.performanceOptimization?.recommendations.total ?? 'yok'} öneri • Slow request %{summary.performanceOptimization?.metrics.slowRequestRate ?? 'yok'}
      </div>
    </div>
  );
}

