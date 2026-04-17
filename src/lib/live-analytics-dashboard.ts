export interface LiveAnalyticsDbPool {
  active: number;
  idle: number;
  waiting: number;
  utilization: number;
}

export interface LiveAnalyticsEndpoint {
  endpoint: string;
  count: number;
  avgDuration: number;
}

export interface LiveAnalyticsMetricsData {
  errorRate: number;
  avgDuration: number;
  p95Duration: number;
  cacheHitRate: number;
  slowRequests: number;
  totalRequests: number;
  slowestEndpoints?: LiveAnalyticsEndpoint[];
  dbPool?: LiveAnalyticsDbPool;
}

export interface LiveAnalyticsKpiItem {
  id?: string | number;
  name: string;
  description?: string;
  target_value?: number | string | null;
  unit?: string | null;
  alert_triggered?: boolean;
}

export interface LiveAnalyticsKpiData {
  kpis: LiveAnalyticsKpiItem[];
  alertCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeLiveAnalyticsMetrics(payload: unknown): LiveAnalyticsMetricsData | null {
  if (!isRecord(payload)) return null;

  const metrics = payload as Record<string, unknown>;
  if (
    !isNumber(metrics.errorRate) ||
    !isNumber(metrics.avgDuration) ||
    !isNumber(metrics.p95Duration) ||
    !isNumber(metrics.cacheHitRate) ||
    !isNumber(metrics.slowRequests) ||
    !isNumber(metrics.totalRequests)
  ) {
    return null;
  }

  return {
    errorRate: metrics.errorRate,
    avgDuration: metrics.avgDuration,
    p95Duration: metrics.p95Duration,
    cacheHitRate: metrics.cacheHitRate,
    slowRequests: metrics.slowRequests,
    totalRequests: metrics.totalRequests,
    slowestEndpoints: Array.isArray(metrics.slowestEndpoints)
      ? (metrics.slowestEndpoints as LiveAnalyticsEndpoint[])
      : undefined,
    dbPool: isRecord(metrics.dbPool)
      ? {
          active: Number(metrics.dbPool.active || 0),
          idle: Number(metrics.dbPool.idle || 0),
          waiting: Number(metrics.dbPool.waiting || 0),
          utilization: Number(metrics.dbPool.utilization || 0),
        }
      : undefined,
  };
}

export function normalizeLiveAnalyticsKpi(payload: unknown): LiveAnalyticsKpiData | null {
  if (!isRecord(payload) || !Array.isArray(payload.kpis) || !isNumber(payload.alertCount)) {
    return null;
  }

  return {
    kpis: payload.kpis as LiveAnalyticsKpiItem[],
    alertCount: payload.alertCount,
  };
}

export function getLiveAnalyticsErrorRateClass(rate: number): string {
  if (rate < 2) return 'text-green-600';
  if (rate < 5) return 'text-yellow-600';
  return 'text-red-600';
}

export function getLiveAnalyticsResponseClass(duration: number): string {
  if (duration < 200) return 'text-green-600';
  if (duration < 500) return 'text-yellow-600';
  return 'text-red-600';
}

export function getLiveAnalyticsProgressClass(percent: number, threshold: number): string {
  if (percent < threshold * 0.5) return 'bg-green-500';
  if (percent < threshold) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function formatLiveAnalyticsTime(date = new Date()): string {
  return date.toLocaleTimeString('tr-TR');
}

function renderMetricCard(options: {
  title: string;
  value: string;
  valueClass: string;
  helper: string;
  progressWidth?: number;
  progressClass?: string;
  footer?: string;
}) {
  const width = Math.max(0, Math.min(options.progressWidth ?? 0, 100));
  return `
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="mb-2 text-sm font-medium text-gray-600">${options.title}</h3>
      <div class="mb-3 text-3xl font-bold ${options.valueClass}">${options.value}</div>
      ${
        options.progressClass
          ? `<div class="h-2 w-full rounded-full bg-gray-200"><div class="h-2 rounded-full transition-all ${options.progressClass}" style="width: ${width}%"></div></div>`
          : ''
      }
      <p class="mt-2 text-xs text-gray-500">${options.helper}</p>
      ${options.footer ? `<div class="mt-2 text-xs text-gray-500">${options.footer}</div>` : ''}
    </div>
  `;
}

function renderSlowestEndpoints(metrics: LiveAnalyticsMetricsData): string {
  if (!metrics.slowestEndpoints || metrics.slowestEndpoints.length === 0) return '';

  return `
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">En yavaş uç noktalar (İlk 5)</h3>
      <div class="space-y-3">
        ${metrics.slowestEndpoints
          .map(
            (endpoint) => `
              <div class="flex items-center justify-between rounded bg-gray-50 p-3">
                <div class="flex-1">
                  <p class="font-mono text-sm text-gray-700">${endpoint.endpoint}</p>
                  <p class="text-xs text-gray-500">${endpoint.count} istek • Ortalama: ${endpoint.avgDuration}ms</p>
                </div>
                <div class="text-right ${getLiveAnalyticsResponseClass(endpoint.avgDuration)}">
                  <p class="font-semibold">${endpoint.avgDuration}ms</p>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderKpiPanel(kpi: LiveAnalyticsKpiData | null): string {
  if (!kpi) return '';

  return `
    <div class="rounded-lg bg-white p-6 shadow">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">KPI İzlemesi</h3>
        ${
          kpi.alertCount > 0
            ? `<div class="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-red-800"><span class="h-2 w-2 animate-pulse rounded-full bg-red-600"></span><span class="text-sm font-semibold">${kpi.alertCount} uyarı</span></div>`
            : ''
        }
      </div>
      ${
        kpi.kpis.length > 0
          ? `<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              ${kpi.kpis
                .slice(0, 6)
                .map(
                  (item) => `
                    <div class="rounded border-l-4 p-4 ${
                      item.alert_triggered ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                    }">
                      <h4 class="mb-1 text-sm font-semibold text-gray-900">${item.name}</h4>
                      <p class="mb-2 text-xs text-gray-600">${item.description || ''}</p>
                      ${
                        item.target_value !== undefined && item.target_value !== null
                          ? `<div class="flex items-center justify-between"><span class="text-xs text-gray-600">Hedef:</span><span class="font-bold text-gray-900">${item.target_value} ${item.unit || ''}</span></div>`
                          : ''
                      }
                    </div>
                  `,
                )
                .join('')}
            </div>`
          : '<p class="text-sm text-gray-600">Henüz KPI tanımlanmamış.</p>'
      }
    </div>
  `;
}

export function renderLiveAnalyticsDashboard(options: {
  metrics: LiveAnalyticsMetricsData;
  kpi: LiveAnalyticsKpiData | null;
  connected: boolean;
  lastUpdate: string | null;
}): string {
  const { metrics, kpi, connected, lastUpdate } = options;

  return `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-gray-900">Canlı analitik gösterge paneli</h2>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
          <span class="text-sm text-gray-600">${connected ? 'Canlı' : 'Bağlantısız'}${
            lastUpdate ? ` • Son güncelleme: ${lastUpdate}` : ''
          }</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        ${renderMetricCard({
          title: 'Hata Oranı',
          value: `${metrics.errorRate.toFixed(2)}%`,
          valueClass: getLiveAnalyticsErrorRateClass(metrics.errorRate),
          progressWidth: metrics.errorRate * 20,
          progressClass: getLiveAnalyticsProgressClass(metrics.errorRate, 5),
          helper:
            metrics.errorRate < 2 ? '✓ İyi' : metrics.errorRate < 5 ? '⚠ Dikkat' : '✗ Kritik',
        })}
        ${renderMetricCard({
          title: 'Ortalama Yanıt Süresi',
          value: `${metrics.avgDuration}ms`,
          valueClass: getLiveAnalyticsResponseClass(metrics.avgDuration),
          progressWidth: (metrics.avgDuration / 500) * 100,
          progressClass: getLiveAnalyticsProgressClass(metrics.avgDuration, 500),
          helper:
            metrics.avgDuration < 200 ? '✓ İyi' : metrics.avgDuration < 500 ? '⚠ Normal' : '✗ Yavaş',
        })}
        ${renderMetricCard({
          title: 'P95 Yanıt Süresi',
          value: `${metrics.p95Duration}ms`,
          valueClass: 'text-blue-600',
          progressWidth: (metrics.p95Duration / 1000) * 100,
          progressClass: 'bg-blue-500',
          helper: '95. yüzdelik gecikme',
        })}
        ${renderMetricCard({
          title: 'Önbellek İsabet Oranı',
          value: `${metrics.cacheHitRate.toFixed(1)}%`,
          valueClass: 'text-green-600',
          progressWidth: metrics.cacheHitRate,
          progressClass: 'bg-green-500',
          helper: metrics.cacheHitRate > 70 ? '✓ Mükemmel' : '⚠ İyileştir',
        })}
        ${renderMetricCard({
          title: 'DB Havuzu Kullanımı',
          value: `${metrics.dbPool?.utilization.toFixed(1) || '0.0'}%`,
          valueClass:
            metrics.dbPool && metrics.dbPool.utilization < 80 ? 'text-green-600' : 'text-red-600',
          progressWidth: metrics.dbPool?.utilization || 0,
          progressClass:
            metrics.dbPool && metrics.dbPool.utilization < 80 ? 'bg-green-500' : 'bg-red-500',
          helper: 'Bağlantı havuzu kullanımı',
          footer: `Aktif: ${metrics.dbPool?.active || 0} • Boşta: ${metrics.dbPool?.idle || 0} • Beklemede: ${metrics.dbPool?.waiting || 0}`,
        })}
        ${renderMetricCard({
          title: 'Toplam İstekler',
          value: metrics.totalRequests.toLocaleString('tr-TR'),
          valueClass: 'text-indigo-600',
          helper: `Yavaş istekler: <span class="font-semibold text-orange-600">${metrics.slowRequests}</span>`,
        })}
      </div>

      ${renderSlowestEndpoints(metrics)}
      ${renderKpiPanel(kpi)}
    </div>
  `;
}
