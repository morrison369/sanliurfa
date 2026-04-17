import {
  classifyIntegrationStatus,
  classifyNightlyStatus,
  classifyReleaseGateStatus,
  type AdminStatusLevel,
} from './admin-status';
import type { AdminDashboardOverviewData } from '../types/admin-api';

function tone(level: AdminStatusLevel): string {
  if (level === 'healthy') return 'text-emerald-700 dark:text-emerald-300';
  if (level === 'degraded') return 'text-amber-700 dark:text-amber-300';
  return 'text-red-700 dark:text-red-300';
}

function card(title: string, body: string): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 class="mb-4 text-sm font-semibold text-gray-900 dark:text-white">${title}</h3>
      ${body}
    </div>
  `;
}

function metric(label: string, value: string, note: string, valueTone = 'text-gray-900 dark:text-white'): string {
  return `
    <div>
      <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">${label}</div>
      <div class="text-2xl font-bold ${valueTone}">${value}</div>
      <div class="text-xs text-gray-500 dark:text-gray-400">${note}</div>
    </div>
  `;
}

function buildPeriodButtons(period: number): string {
  return [7, 30, 90, 365]
    .map((days) => {
      const active = period === days;
      return `
        <button
          type="button"
          data-admin-dashboard-period="${days}"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            active
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }"
        >
          ${days === 7 ? '7 gün' : days === 30 ? '30 gün' : days === 90 ? '3 ay' : '1 yıl'}
        </button>
      `;
    })
    .join('');
}

export function renderAdminDashboardOverview(options: {
  data: AdminDashboardOverviewData | null;
  error: string | null;
  period: number;
}): string {
  const { data, error, period } = options;

  if (error) {
    return `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <h3 class="font-medium text-red-900 dark:text-red-100">Hata</h3>
        <p class="mt-1 text-sm text-red-700 dark:text-red-200">${error}</p>
      </div>
    `;
  }

  if (!data) {
    return '';
  }

  const integrationLevel = classifyIntegrationStatus({
    configuredCount: data.integrations?.summary?.configuredCount ?? 0,
    total: data.integrations?.summary?.total ?? 2,
    verificationHealthy: data.integrations?.verification?.summary?.healthy,
  });
  const releaseGateLevel = data.releaseGate ? classifyReleaseGateStatus(data.releaseGate) : 'blocked';
  const nightlyRegressionLevel = data.nightly ? classifyNightlyStatus(data.nightly.regression) : 'blocked';
  const nightlyE2eLevel = data.nightly ? classifyNightlyStatus(data.nightly.e2e) : 'blocked';

  const cards = [
    card(
      'Ops Durumu',
      metric(
        'Genel durum',
        data.statusSummary?.overall || 'blocked',
        `Sürüm: ${releaseGateLevel} • Regresyon: ${nightlyRegressionLevel} • E2E: ${nightlyE2eLevel}`,
        tone(data.statusSummary?.overall || 'blocked'),
      ),
    ),
    card(
      'Kullanıcılar',
      metric(
        'Toplam',
        String(data.overview.users.total),
        `+${data.overview.users.new} yeni • ${data.overview.users.active} aktif`,
      ),
    ),
    card(
      'İçerik',
      metric(
        'Mekan',
        String(data.overview.content.places),
        `${data.overview.content.reviews} inceleme • +${data.overview.content.newReviews}`,
      ),
    ),
    card(
      'Bayraklar',
      metric(
        'Bekleyen',
        String(data.overview.flags.pending),
        `${data.overview.flags.resolved} çözüldü`,
        'text-orange-600 dark:text-orange-300',
      ),
    ),
    card(
      'Moderasyon',
      metric(
        'Toplam aksiyon',
        String(data.overview.moderation.totalActions),
        `${data.overview.moderation.warnings} uyarı • ${data.overview.moderation.bans} ban`,
        'text-red-600 dark:text-red-300',
      ),
    ),
    card(
      'Entegrasyonlar',
      metric(
        'Yapılandırma',
        `${data.integrations?.summary?.configuredCount ?? 0}/${data.integrations?.summary?.total ?? 2}`,
        `Durum: ${integrationLevel}`,
        tone(integrationLevel),
      ) +
        `<div class="mt-2 text-xs text-gray-500 dark:text-gray-400">RESEND: ${data.integrations?.resend?.source || 'yok'} • Analitik: ${data.integrations?.analytics?.source || 'yok'}</div>`,
    ),
  ];

  const moderationCard = data.moderation
    ? card(
        'Moderasyon İstatistikleri',
        `<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          ${metric('Beklemede', String(data.moderation.queue.pending), 'kuyruk', 'text-orange-600 dark:text-orange-300')}
          ${metric('İncelemede', String(data.moderation.queue.inReview), 'kuyruk', 'text-blue-600 dark:text-blue-300')}
          ${metric('Yüksek önem', String(data.moderation.flags.highSeverity), 'bayrak', 'text-red-600 dark:text-red-300')}
          ${metric('Suspansiyon', String(data.moderation.actions.suspensions), 'aksiyon', 'text-purple-600 dark:text-purple-300')}
        </div>`,
      )
    : '';

  const operationalCard = data.operational
    ? card(
        'Operasyon Özeti',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          ${metric('OAuth callback hata', `%${data.operational.oauth.callback.errorRatePercent}`, `Örnek: ${data.operational.oauth.callback.sampleSize}`)}
          ${metric('Stripe webhook', `%${data.operational.webhook.stripe.errorRatePercent}`, `p95 ${data.operational.webhook.stripe.p95DurationMs}ms • Örnek ${data.operational.webhook.stripe.sampleSize}`)}
          ${metric('Arama trendi', String(data.operational.search.totalTopSearches), data.operational.search.topQueries?.[0] ? `${data.operational.search.topQueries[0].query} (${data.operational.search.topQueries[0].count})` : 'Veri yok')}
        </div>`,
      )
    : '';

  const performanceCard = data.performanceOptimization
    ? card(
        'Performans Optimizasyonu',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          ${metric('Öneriler', String(data.performanceOptimization.recommendations.total), `Yüksek: ${data.performanceOptimization.recommendations.highPriority} • Orta: ${data.performanceOptimization.recommendations.mediumPriority}`)}
          ${metric('Yavaş query/request', `${data.performanceOptimization.metrics.slowQueriesCount} / %${data.performanceOptimization.metrics.slowRequestRate}`, `Avg: ${data.performanceOptimization.metrics.avgRequestDuration}ms • p95: ${data.performanceOptimization.metrics.p95Duration}ms`)}
          ${metric('Cache/Index', `%${data.performanceOptimization.metrics.cacheHitRate} / ${data.performanceOptimization.indexSuggestions.count}`, `Strategy: ${data.performanceOptimization.cacheStrategies.count}`)}
          ${metric('Son yavaş operasyon', data.performanceOptimization.slowOperations[0] ? `${data.performanceOptimization.slowOperations[0].type} • ${data.performanceOptimization.slowOperations[0].duration}ms` : 'yok', data.performanceOptimization.slowOperations[0]?.message || 'Kayıt yok')}
        </div>`,
      )
    : '';

  const auditCard = (data as any).adminOpsAudit
    ? card(
        'Admin Ops Denetimi',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          ${metric('Toplam / pencere', String((data as any).adminOpsAudit.total), `${(data as any).adminOpsAudit.windowHours} saat`)}
          ${metric('Denied / rate limit', `${(data as any).adminOpsAudit.deniedCount} / ${(data as any).adminOpsAudit.rateLimitedCount}`, `Son denied: ${(data as any).adminOpsAudit.lastDeniedAt || 'yok'}`)}
          ${metric('Write', String((data as any).adminOpsAudit.writeCount), 'mutation audit hacmi')}
          ${metric('Read', String((data as any).adminOpsAudit.readCount), 'read audit hacmi')}
        </div>`,
      )
    : '';

  const accessCoverageCard = (data as any).adminAccessCoverage
    ? card(
        'Admin Erişim Kapsaması',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          ${metric('Kapsama', `%${(data as any).adminAccessCoverage.coveragePercent}`, (data as any).adminAccessCoverage.available ? 'rapor var' : 'rapor yok')}
          ${metric('Route / wrapper', `${(data as any).adminAccessCoverage.routeFiles} / ${(data as any).adminAccessCoverage.wrapperFiles}`, 'admin api kapsaması')}
          ${metric('Drift', String((data as any).adminAccessCoverage.driftCount), 'wrapper dışı dosya', (data as any).adminAccessCoverage.driftCount > 0 ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300')}
          ${metric('Son üretim', (data as any).adminAccessCoverage.generatedAt || 'Henüz yok', (data as any).adminAccessCoverage.driftedFiles?.[0] || 'Drift yok')}
        </div>`,
      )
    : '';

  const artifactCard = data.artifactHealth
    ? card(
        'Artefact Sağlığı',
        `<div class="mb-4 text-xs text-gray-500 dark:text-gray-400">Sağlıklı: ${data.artifactHealthSummary?.healthyCount ?? 0} • Bozulmuş: ${data.artifactHealthSummary?.degradedCount ?? 0} • Engelli: ${data.artifactHealthSummary?.blockedCount ?? 0}</div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
          ${metric('Sürüm Kapısı', data.artifactHealth.releaseGate.available ? 'var' : 'yok', `${data.artifactHealth.releaseGate.status} • ${data.artifactHealth.releaseGate.generatedAt || 'Henüz yok'}`, tone(data.artifactHealth.releaseGate.status))}
          ${metric('Gece Regresyonu', data.artifactHealth.nightlyRegression.available ? 'var' : 'yok', `${data.artifactHealth.nightlyRegression.status} • ${data.artifactHealth.nightlyRegression.generatedAt || 'Henüz yok'}`, tone(data.artifactHealth.nightlyRegression.status))}
          ${metric('Gece E2E', data.artifactHealth.nightlyE2E.available ? 'var' : 'yok', `${data.artifactHealth.nightlyE2E.status} • ${data.artifactHealth.nightlyE2E.generatedAt || 'Henüz yok'}`, tone(data.artifactHealth.nightlyE2E.status))}
          ${metric('Performans Ops', data.artifactHealth.performanceOps.available ? 'var' : 'yok', `${data.artifactHealth.performanceOps.status} • ${data.artifactHealth.performanceOps.generatedAt || 'Henüz yok'}`, tone(data.artifactHealth.performanceOps.status))}
          ${metric('Erişim Kapsaması', data.artifactHealth.adminAccessCoverage.available ? 'var' : 'yok', `${data.artifactHealth.adminAccessCoverage.status} • ${data.artifactHealth.adminAccessCoverage.generatedAt || 'Henüz yok'}`, tone(data.artifactHealth.adminAccessCoverage.status))}
        </div>`,
      )
    : '';

  const verificationCard = data.integrations?.verification
    ? card(
        'Entegrasyon Doğrulama',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          ${metric('RESEND', data.integrations.verification.resend.status, data.integrations.verification.resend.message)}
          ${metric('Analitik', data.integrations.verification.analytics.status, data.integrations.verification.analytics.message)}
        </div>
        <div class="mt-3 text-xs text-gray-500 dark:text-gray-400">Son kontrol: ${data.integrations.verification.summary.checkedAt}</div>`,
      )
    : '';

  const releaseGateCard = data.releaseGate
    ? card(
        'Sürüm Kapısı',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          ${metric('Durum', releaseGateLevel, `Nihai: ${data.releaseGate.finalStatus}`, tone(releaseGateLevel))}
          ${metric('Hata sayısı', String(data.releaseGate.failedStepCount), `Bloklayıcı: ${data.releaseGate.blockingFailedSteps[0] || 'yok'}`)}
          ${metric('Son üretim', data.releaseGate.generatedAt || 'Henüz yok', `Danışma: ${data.releaseGate.advisoryFailedSteps[0] || 'yok'}`)}
        </div>
        <div class="mt-3 text-xs text-gray-500 dark:text-gray-400">Erişim kapsaması: %${data.releaseGate.adminAccessCoverage?.coveragePercent ?? 'yok'} • Drift ${data.releaseGate.adminAccessCoverage?.driftCount ?? 'yok'} • Drift dosyası: ${data.releaseGate.adminAccessCoverage?.driftedFiles?.[0] || 'yok'}</div>`,
      )
    : '';

  const nightlyCard = data.nightly
    ? card(
        'Gece Trendi',
        `<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">Regresyon</div>
            <div class="text-xl font-bold ${tone(nightlyRegressionLevel)}">${nightlyRegressionLevel}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Sonuç: ${data.nightly.regression.outcome} • Başarı oranı: ${data.nightly.regression.successRatePercent ?? 'yok'}%</div>
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Hata: ${data.nightly.regression.topFailures[0] || 'yok'}</div>
          </div>
          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">E2E</div>
            <div class="text-xl font-bold ${tone(nightlyE2eLevel)}">${nightlyE2eLevel}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Sonuç: ${data.nightly.e2e.outcome} • Başarı oranı: ${data.nightly.e2e.successRatePercent ?? 'yok'}%</div>
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Hata: ${data.nightly.e2e.topFailures[0] || 'yok'}</div>
          </div>
        </div>`,
      )
    : '';

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap gap-2">
        ${buildPeriodButtons(period)}
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        ${cards.join('')}
      </div>

      ${moderationCard}
      ${operationalCard}
      ${performanceCard}
      ${auditCard}
      ${accessCoverageCard}
      ${artifactCard}
      ${verificationCard}
      ${releaseGateCard}
      ${nightlyCard}
    </div>
  `;
}
