import { renderEmptyState, renderErrorState } from './render-states';
import { UI_COPY_TR } from './ui-copy';

export interface AnalyticsPanelPlatformStats {
  avgSessionDuration: number;
  period: number;
  totalConversions: number;
  totalSessions: number;
  totalTimeSpent: number;
  uniquePages: number;
  uniqueSearches: number;
  uniqueUsers: number;
}

export interface AnalyticsPanelTrendingPlace {
  avgRating: number;
  category: string | null;
  id: string;
  name: string | null;
  reviewCount: number;
  totalClicks: number;
  totalLikes: number;
  totalShares: number;
  totalViews: number;
}

export interface AnalyticsPanelSearchTrend {
  avgResults: number;
  count: number;
  query: string;
}

export interface AnalyticsPanelData {
  period: number;
  platformStats: AnalyticsPanelPlatformStats;
  searchTrends: AnalyticsPanelSearchTrend[];
  trendingPlaces: AnalyticsPanelTrendingPlace[];
}

function isAnalyticsData(value: unknown): value is AnalyticsPanelData {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<AnalyticsPanelData>;
  return !!candidate.platformStats && Array.isArray(candidate.searchTrends) && Array.isArray(candidate.trendingPlaces);
}

export function extractAnalyticsPanelData(payload: unknown): AnalyticsPanelData | null {
  if (isAnalyticsData(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const directData = (payload as { data?: unknown }).data;
    if (isAnalyticsData(directData)) {
      return directData;
    }

    if (directData && typeof directData === 'object') {
      const nestedData = (directData as { data?: unknown }).data;
      if (isAnalyticsData(nestedData)) {
        return nestedData;
      }
    }
  }

  return null;
}

function renderMetricCard(label: string, value: string, tone = 'default'): string {
  const toneClass =
    tone === 'accent'
      ? 'border-blue-200 bg-blue-50 text-blue-900'
      : 'border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white';

  return `
    <div class="rounded-lg border p-4 ${toneClass}">
      <p class="text-sm text-gray-600 dark:text-gray-400">${label}</p>
      <p class="mt-2 text-3xl font-bold">${value}</p>
    </div>
  `;
}

function renderTrendingPlaces(places: AnalyticsPanelTrendingPlace[]): string {
  if (places.length === 0) {
    return renderEmptyState('Trend mekan verisi bulunmuyor.', 'text-sm text-gray-600 dark:text-gray-400');
  }

  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      ${places
        .map(
          (place) => `
            <a
              href="/mekan/${place.id}"
              class="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <h4 class="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">${place.name ?? 'Adsız mekan'}</h4>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">${place.category ?? 'Kategori yok'}</p>
              <div class="mt-3 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>👁️ ${place.totalViews.toLocaleString('tr-TR')}</span>
                <span>⭐ ${place.avgRating.toFixed(1)}</span>
              </div>
              <div class="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>📝 ${place.reviewCount.toLocaleString('tr-TR')}</span>
                <span>👍 ${place.totalLikes.toLocaleString('tr-TR')}</span>
              </div>
            </a>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderSearchTrends(trends: AnalyticsPanelSearchTrend[]): string {
  if (trends.length === 0) {
    return renderEmptyState('Popüler arama verisi bulunmuyor.', 'text-sm text-gray-600 dark:text-gray-400');
  }

  return `
    <div class="space-y-2">
      ${trends
        .slice(0, 10)
        .map(
          (trend) => `
            <div class="flex items-center justify-between rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <span class="font-medium text-gray-900 dark:text-white">${trend.query}</span>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                ${trend.count.toLocaleString('tr-TR')} arama · ort. ${trend.avgResults.toLocaleString('tr-TR')} sonuç
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderAnalyticsPanel(options: {
  days: number;
  data: AnalyticsPanelData | null;
  error: string | null;
}): string {
  const activeDays = options.days === 7 || options.days === 90 || options.days === 365 ? options.days : 30;
  const data = options.data;
  const stats = data?.platformStats;
  const totalTimeHours = Math.round((stats?.totalTimeSpent || 0) / 3600);

  return `
    <div class="space-y-8">
      <div class="flex flex-wrap gap-2">
        ${[7, 30, 90, 365]
          .map((days) => {
            const active = activeDays === days;
            const label = days === 365 ? '1 yıl' : `${days} gün`;
            const classes = active
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300';
            return `<button type="button" data-analytics-panel-days="${days}" class="rounded px-4 py-2 font-medium ${classes}">${label}</button>`;
          })
          .join('')}
      </div>

      ${options.error ? renderErrorState(options.error) : ''}

      ${
        data
          ? `
            <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
              ${renderMetricCard('Aktif kullanıcı', stats?.uniqueUsers.toLocaleString('tr-TR') || '0')}
              ${renderMetricCard('Toplam oturum', stats?.totalSessions.toLocaleString('tr-TR') || '0')}
              ${renderMetricCard('Benzersiz sayfa', stats?.uniquePages.toLocaleString('tr-TR') || '0')}
              ${renderMetricCard('Toplam arama', stats?.uniqueSearches.toLocaleString('tr-TR') || '0', 'accent')}
            </div>

            <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">${UI_COPY_TR.analytics.platformSummary}</h3>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div class="text-center">
                  <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">Ort. oturum süresi</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">${stats?.avgSessionDuration.toLocaleString('tr-TR') || '0'} sn</p>
                </div>
                <div class="text-center">
                  <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">Toplam süre</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">${totalTimeHours.toLocaleString('tr-TR')} saat</p>
                </div>
                <div class="text-center">
                  <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">Toplam dönüşüm</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">${stats?.totalConversions.toLocaleString('tr-TR') || '0'}</p>
                </div>
                <div class="text-center">
                  <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">Analiz periyodu</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">${data.period.toLocaleString('tr-TR')} gün</p>
                </div>
              </div>
            </div>

            <div>
              <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">${UI_COPY_TR.analytics.trendingPlaces}</h3>
              ${renderTrendingPlaces(data.trendingPlaces)}
            </div>

            <div>
              <h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">${UI_COPY_TR.analytics.popularSearches}</h3>
              ${renderSearchTrends(data.searchTrends)}
            </div>
          `
          : !options.error
            ? renderEmptyState(UI_COPY_TR.analytics.unavailable, 'rounded border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400')
            : ''
      }
    </div>
  `;
}
