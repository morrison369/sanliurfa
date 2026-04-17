export interface WebhookAnalyticsActivity {
  time: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface WebhookAnalyticsFailure {
  event: string;
  failedCount: number;
  attempts: number;
}

export interface WebhookAnalyticsEventStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface WebhookAnalyticsMetrics {
  totalWebhooks: number;
  totalEvents: number;
  deliveredEvents: number;
  failedEvents: number;
  pendingEvents: number;
  successRate: number;
  avgDeliveryTime: number;
  byEvent: Record<string, WebhookAnalyticsEventStats>;
  lastHourActivity: WebhookAnalyticsActivity[];
  topFailedEvents: WebhookAnalyticsFailure[];
}

export type WebhookAnalyticsTab = 'overview' | 'events' | 'failed';

function isMetrics(value: unknown): value is WebhookAnalyticsMetrics {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WebhookAnalyticsMetrics>;
  return (
    typeof candidate.totalWebhooks === 'number' &&
    typeof candidate.totalEvents === 'number' &&
    typeof candidate.deliveredEvents === 'number' &&
    typeof candidate.failedEvents === 'number' &&
    typeof candidate.pendingEvents === 'number' &&
    typeof candidate.successRate === 'number' &&
    typeof candidate.avgDeliveryTime === 'number' &&
    !!candidate.byEvent &&
    Array.isArray(candidate.lastHourActivity) &&
    Array.isArray(candidate.topFailedEvents)
  );
}

export function extractWebhookAnalyticsMetrics(payload: unknown): WebhookAnalyticsMetrics | null {
  if (isMetrics(payload)) return payload;

  if (payload && typeof payload === 'object') {
    const directData = (payload as { data?: unknown }).data;
    if (isMetrics(directData)) return directData;

    if (directData && typeof directData === 'object') {
      const nestedData = (directData as { data?: unknown }).data;
      if (isMetrics(nestedData)) return nestedData;
    }
  }

  return null;
}

export function normalizeWebhookAnalyticsTab(value: string | null | undefined): WebhookAnalyticsTab {
  return value === 'events' || value === 'failed' ? value : 'overview';
}

export function getWebhookStatusColor(rate: number): string {
  if (rate >= 95) return 'text-green-600';
  if (rate >= 80) return 'text-yellow-600';
  return 'text-red-600';
}

function renderTabButton(tab: WebhookAnalyticsTab, activeTab: WebhookAnalyticsTab): string {
  const label =
    tab === 'overview' ? 'Genel görünüm' : tab === 'events' ? 'Olaylar' : 'Başarısız';
  const active =
    activeTab === tab
      ? 'text-blue-600 border-b-2 border-blue-600'
      : 'text-gray-600 hover:text-gray-900';

  return `<button type="button" data-webhook-analytics-tab="${tab}" class="flex-1 px-4 py-3 text-center font-medium transition ${active}">${label}</button>`;
}

function renderOverview(metrics: WebhookAnalyticsMetrics): string {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="mb-4 font-semibold text-gray-900">Son saat etkinliği</h3>
        <div class="max-h-96 space-y-2 overflow-y-auto">
          ${metrics.lastHourActivity
            .slice(0, 20)
            .map(
              (activity) => `
                <div class="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                  <span class="text-gray-600">${new Date(activity.time).toLocaleTimeString('tr-TR')}</span>
                  <div class="flex gap-4">
                    <span class="text-blue-600">Gönderilen: ${activity.sent}</span>
                    <span class="text-green-600">Teslim: ${activity.delivered}</span>
                    <span class="text-red-600">Başarısız: ${activity.failed}</span>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEvents(metrics: WebhookAnalyticsMetrics): string {
  return `
    <div class="space-y-4">
      <h3 class="mb-4 font-semibold text-gray-900">Olay türü başarı oranları</h3>
      ${Object.entries(metrics.byEvent)
        .map(
          ([event, stats]) => `
            <div class="rounded-lg bg-gray-50 p-4">
              <div class="mb-2 flex items-start justify-between">
                <h4 class="font-medium text-gray-900">${event}</h4>
                <span class="text-sm font-semibold ${getWebhookStatusColor(stats.successRate)}">${stats.successRate}%</span>
              </div>
              <div class="mb-2 h-2 w-full rounded-full bg-gray-200">
                <div class="h-2 rounded-full bg-blue-600" style="width: ${Math.min(stats.successRate, 100)}%"></div>
              </div>
              <div class="grid grid-cols-4 gap-2 text-xs text-gray-600">
                <div>Toplam: ${stats.total}</div>
                <div>Başarılı: ${stats.delivered}</div>
                <div>Başarısız: ${stats.failed}</div>
                <div>Bekleme: ${stats.pending}</div>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderFailed(metrics: WebhookAnalyticsMetrics): string {
  if (metrics.topFailedEvents.length === 0) {
    return '<p class="py-8 text-center text-gray-500">Başarısız olay yok 🎉</p>';
  }

  return `
    <div class="space-y-4">
      <h3 class="mb-4 font-semibold text-gray-900">En çok başarısız olaylar</h3>
      ${metrics.topFailedEvents
        .map(
          (item) => `
            <div class="rounded-lg border border-red-200 bg-red-50 p-4">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-gray-900">${item.event}</h4>
                  <p class="mt-1 text-sm text-gray-600">${item.failedCount} başarısız, ${item.attempts} toplam deneme</p>
                </div>
                <button class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">Yeniden dene</button>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderWebhookAnalyticsDashboard(options: {
  metrics: WebhookAnalyticsMetrics | null;
  error: string | null;
  activeTab: WebhookAnalyticsTab;
}): string {
  if (options.error || !options.metrics) {
    return `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4">
        <p class="text-red-700">${options.error || 'Webhook analitikleri yüklenemedi.'}</p>
      </div>
    `;
  }

  const metrics = options.metrics;

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900">Webhook analitikleri</h2>
        <button
          type="button"
          data-webhook-analytics-refresh
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
        >
          Yenile
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-lg bg-white p-4 shadow-md">
          <p class="text-sm text-gray-600">Toplam webhook</p>
          <p class="text-3xl font-bold text-gray-900">${metrics.totalWebhooks}</p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-md">
          <p class="text-sm text-gray-600">Toplam olay sayısı</p>
          <p class="text-3xl font-bold text-gray-900">${metrics.totalEvents}</p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-md">
          <p class="text-sm text-gray-600">Başarılı</p>
          <p class="text-3xl font-bold text-green-600">${metrics.deliveredEvents}</p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-md">
          <p class="text-sm text-gray-600">Başarısız</p>
          <p class="text-3xl font-bold text-red-600">${metrics.failedEvents}</p>
        </div>
        <div class="rounded-lg bg-white p-4 shadow-md">
          <p class="text-sm text-gray-600">Genel başarı oranı</p>
          <p class="text-3xl font-bold ${getWebhookStatusColor(metrics.successRate)}">${metrics.successRate.toFixed(1)}%</p>
        </div>
      </div>

      <div class="rounded-lg bg-white shadow-md">
        <div class="flex border-b">
          ${(['overview', 'events', 'failed'] as const)
            .map((tab) => renderTabButton(tab, options.activeTab))
            .join('')}
        </div>

        <div class="p-6">
          ${
            options.activeTab === 'events'
              ? renderEvents(metrics)
              : options.activeTab === 'failed'
                ? renderFailed(metrics)
                : renderOverview(metrics)
          }
        </div>
      </div>
    </div>
  `;
}
