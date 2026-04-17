import type { AdminPerformanceOptimizationData } from '../types/admin-api';
import { formatAdminDateTime } from './admin-format';
import type { AdminStatusLevel } from './admin-status';

export type AdminPerformanceDashboardTab =
  | 'summary'
  | 'recommendations'
  | 'slow-operations'
  | 'artifacts';

const TAB_LABELS: Record<AdminPerformanceDashboardTab, string> = {
  summary: 'Ozet',
  recommendations: 'Oneriler',
  'slow-operations': 'Yavas Operasyonlar',
  artifacts: 'Artifact Health',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStatus(value: unknown): AdminStatusLevel {
  return value === 'healthy' || value === 'degraded' || value === 'blocked' ? value : 'blocked';
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatMilliseconds(value: number): string {
  return `${Math.round(value)}ms`;
}

function statusClasses(status: AdminStatusLevel): string {
  if (status === 'healthy') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'degraded') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-red-50 text-red-700 border border-red-200';
}

function statusLabel(status: AdminStatusLevel): string {
  if (status === 'healthy') return 'Saglikli';
  if (status === 'degraded') return 'Degrede';
  return 'Bloklu';
}

function recommendationPriorityLabel(priority: string): string {
  if (priority === 'high') return 'Yuksek';
  if (priority === 'medium') return 'Orta';
  return 'Dusuk';
}

function recommendationPriorityClasses(priority: string): string {
  if (priority === 'high') return 'bg-red-100 text-red-700';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export function normalizeAdminPerformanceTab(value: string | undefined): AdminPerformanceDashboardTab {
  return value === 'recommendations' || value === 'slow-operations' || value === 'artifacts'
    ? value
    : 'summary';
}

export function extractAdminPerformanceDashboardData(
  payload: unknown,
): AdminPerformanceOptimizationData | null {
  const root = asRecord(payload);
  if (!root) return null;

  const rootData = asRecord(root.data);
  const nestedData = asRecord(rootData?.data);
  const candidate = (nestedData ?? rootData ?? root) as Record<string, unknown>;

  if (!Array.isArray(candidate.recommendations) || !candidate.metrics || !candidate.artifactHealthSummary) {
    return null;
  }

  return candidate as unknown as AdminPerformanceOptimizationData;
}

export function renderAdminPerformanceDashboard(options: {
  tab: AdminPerformanceDashboardTab;
  data: AdminPerformanceOptimizationData | null;
  error: string | null;
}): string {
  const tabs = (Object.keys(TAB_LABELS) as AdminPerformanceDashboardTab[])
    .map((tab) => {
      const active = tab === options.tab;
      return `<button type="button" data-admin-performance-tab="${tab}" class="rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }">${TAB_LABELS[tab]}</button>`;
    })
    .join('');

  const body = options.error
    ? `<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">${escapeHtml(options.error)}</div>`
    : options.data
      ? renderTabContent(options.tab, options.data)
      : '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Performans verisi bulunamadi.</div>';

  const generatedAt = options.data
    ? formatAdminDateTime(asString((options.data as Record<string, unknown>).timestamp), 'Henüz uretilmedi')
    : 'Henüz uretilmedi';

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap gap-3">${tabs}</div>
      ${body}
      <div class="text-xs text-slate-500">Son uretim: ${escapeHtml(generatedAt)}</div>
    </div>
  `;
}

function renderTabContent(tab: AdminPerformanceDashboardTab, data: AdminPerformanceOptimizationData): string {
  if (tab === 'recommendations') return renderRecommendations(data);
  if (tab === 'slow-operations') return renderSlowOperations(data);
  if (tab === 'artifacts') return renderArtifacts(data);
  return renderSummary(data);
}

function renderSummary(data: AdminPerformanceOptimizationData): string {
  const root = asRecord(data);
  const metrics = asRecord(root.metrics) ?? {};
  const summary = [
    {
      label: 'Yavas sorgu',
      value: String(asNumber(metrics.slowQueriesCount)),
      detail: '100ms ustu sorgular',
    },
    {
      label: 'Yavas istek orani',
      value: formatPercent(asNumber(metrics.slowRequestRate)),
      detail: '500ms ustu istekler',
    },
    {
      label: 'Cache hit rate',
      value: formatPercent(asNumber(metrics.cacheHitRate)),
      detail: 'Hedef > %60',
    },
    {
      label: 'Ort. sure',
      value: formatMilliseconds(asNumber(metrics.avgRequestDuration)),
      detail: 'Tum request ortalamasi',
    },
    {
      label: 'P95 sure',
      value: formatMilliseconds(asNumber(metrics.p95Duration)),
      detail: 'Yuzde 95 kesimi',
    },
    {
      label: 'Oneriler',
      value: String(asArray(root.recommendations).length),
      detail: `${asArray(root.recommendations).filter((item) => asRecord(item)?.priority === 'high').length} yuksek oncelik`,
    },
  ]
    .map(
      (item) => `
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(item.label)}</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">${escapeHtml(item.value)}</p>
          <p class="mt-1 text-sm text-slate-600">${escapeHtml(item.detail)}</p>
        </div>
      `,
    )
    .join('');

  const cacheStrategies = asRecord(root.cacheStrategies);
  const indexSuggestions = asArray<Record<string, unknown>>(root.indexSuggestions)
    .slice(0, 5)
    .map((item) => `<li>${escapeHtml(asString(item.table, 'Tablo'))}: ${escapeHtml(asString(item.reason, 'Index onerisi'))}</li>`)
    .join('');

  return `
    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${summary}</div>
      <div class="grid gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-sm font-semibold text-slate-900">Cache Stratejileri</h3>
          <p class="mt-2 text-3xl font-bold text-slate-900">${asNumber(cacheStrategies?.strategiesCount)}</p>
          <p class="mt-1 text-sm text-slate-600">Tanimli cache stratejisi sayisi</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-sm font-semibold text-slate-900">Index Onerileri</h3>
          ${indexSuggestions ? `<ul class="mt-3 space-y-2 text-sm text-slate-700">${indexSuggestions}</ul>` : '<p class="mt-2 text-sm text-slate-600">Acil index onerisi yok.</p>'}
        </div>
      </div>
    </div>
  `;
}

function renderRecommendations(data: AdminPerformanceOptimizationData): string {
  const recommendations = asArray<Record<string, unknown>>((data as Record<string, unknown>).recommendations);
  if (!recommendations.length) {
    return '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Aktif performans onerisi bulunmuyor.</div>';
  }

  return `<div class="space-y-4">${recommendations
    .map((recommendation) => {
      const priority = asString(recommendation.priority, 'low');
      return `
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-base font-semibold text-slate-900">${escapeHtml(asString(recommendation.title, 'Oneri'))}</h3>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold ${recommendationPriorityClasses(priority)}">${recommendationPriorityLabel(priority)}</span>
          </div>
          <p class="mt-3 text-sm text-slate-700">${escapeHtml(asString(recommendation.description, ''))}</p>
          <p class="mt-3 text-sm text-slate-600"><span class="font-semibold text-slate-800">Aksiyon:</span> ${escapeHtml(asString(recommendation.action, ''))}</p>
        </div>
      `;
    })
    .join('')}</div>`;
}

function renderSlowOperations(data: AdminPerformanceOptimizationData): string {
  const operations = asArray<Record<string, unknown>>((data as Record<string, unknown>).slowOperations);
  if (!operations.length) {
    return '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Yavas operasyon bulunmuyor.</div>';
  }

  const rows = operations
    .map(
      (operation) => `
        <tr class="border-t border-slate-200">
          <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(asString(operation.type, '-'))}</td>
          <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(asString(operation.message, '-'))}</td>
          <td class="px-4 py-3 text-sm font-semibold text-slate-900">${formatMilliseconds(asNumber(operation.duration))}</td>
          <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(formatAdminDateTime(asString(operation.timestamp), '-'))}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-left">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tip</th>
            <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mesaj</th>
            <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sure</th>
            <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Zaman</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderArtifacts(data: AdminPerformanceOptimizationData): string {
  const root = asRecord(data);
  const artifacts = asRecord(root.artifactHealth) ?? {};
  const summary = asRecord(root.artifactHealthSummary) ?? {};
  const cards = Object.entries(artifacts)
    .map(([name, entry]) => {
      const record = asRecord(entry) ?? {};
      const status = asStatus(record.status);
      return `
        <div class="rounded-xl p-4 ${statusClasses(status)}">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold">${escapeHtml(name)}</h3>
            <span class="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">${statusLabel(status)}</span>
          </div>
          <p class="mt-2 text-sm">Son uretim: ${escapeHtml(formatAdminDateTime(asString(record.generatedAt), 'Henüz uretilmedi'))}</p>
        </div>
      `;
    })
    .join('');

  return `
    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${cards || '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Artifact health verisi bulunamadi.</div>'}</div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Genel Durum</h3>
        <div class="mt-3 grid gap-3 md:grid-cols-4 text-sm text-slate-700">
          <div><span class="font-semibold">Overall:</span> ${escapeHtml(statusLabel(asStatus(summary.overall)))}</div>
          <div><span class="font-semibold">Saglikli:</span> ${asNumber(summary.healthyCount)}</div>
          <div><span class="font-semibold">Degrede:</span> ${asNumber(summary.degradedCount)}</div>
          <div><span class="font-semibold">Bloklu:</span> ${asNumber(summary.blockedCount)}</div>
        </div>
      </div>
    </div>
  `;
}
