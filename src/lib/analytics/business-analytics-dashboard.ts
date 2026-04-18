import { extractEnvelopeMessage, resolveEnvelopeData, resolveNestedEnvelopeData } from '../shared/api-envelope';
import { renderEmptyState, renderErrorState } from '../shared/render-states';

export interface Analytics {
  totalVisitors: number;
  avgRating: number;
  reviewCount: number;
  followerCount: number;
}

export interface Metric {
  date: string;
  view_count: number;
  review_count: number;
  average_rating: number;
  new_followers: number;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  priority: string;
  action_recommendation: string;
  estimated_impact: string;
}

export interface BusinessAnalyticsData {
  analytics: Analytics;
  metrics: Metric[];
}

export function extractBusinessAnalyticsData(payload: unknown): BusinessAnalyticsData | null {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;

  if (!nested || typeof nested !== 'object') return null;

  const analyticsData = nested as {
    analytics?: Analytics;
    metrics?: Metric[];
  };

  if (!analyticsData.analytics || !Array.isArray(analyticsData.metrics)) {
    return null;
  }

  return {
    analytics: analyticsData.analytics,
    metrics: analyticsData.metrics,
  };
}

export function extractBusinessInsights(payload: unknown): Insight[] {
  const nested = resolveNestedEnvelopeData(payload);

  if (!Array.isArray(nested)) {
    return [];
  }

  return nested as Insight[];
}

export function extractBusinessMessage(payload: unknown, fallback: string): string {
  return extractEnvelopeMessage(payload, fallback);
}

function renderDayButtons(days: number): string {
  return `
    <div class="flex gap-2">
      ${[7, 30, 90]
        .map((value) => {
          const active =
            value === days
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300';
          return `
            <button
              type="button"
              data-business-analytics-days="${value}"
              class="rounded-lg px-4 py-2 font-medium transition ${active}"
            >
              ${value} gün
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderAnalyticsCards(analytics: Analytics): string {
  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <p class="text-sm text-gray-600">Toplam ziyaretçi</p>
        <p class="mt-2 text-3xl font-bold text-blue-600">${analytics.totalVisitors.toLocaleString('tr-TR')}</p>
      </div>
      <div class="rounded-lg border border-green-200 bg-green-50 p-6">
        <p class="text-sm text-gray-600">Ortalama puan</p>
        <p class="mt-2 text-3xl font-bold text-green-600">${analytics.avgRating.toFixed(1)}</p>
      </div>
      <div class="rounded-lg border border-purple-200 bg-purple-50 p-6">
        <p class="text-sm text-gray-600">İnceleme sayısı</p>
        <p class="mt-2 text-3xl font-bold text-purple-600">${analytics.reviewCount.toLocaleString('tr-TR')}</p>
      </div>
      <div class="rounded-lg border border-orange-200 bg-orange-50 p-6">
        <p class="text-sm text-gray-600">Takipçi sayısı</p>
        <p class="mt-2 text-3xl font-bold text-orange-600">${analytics.followerCount.toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;
}

function renderPeriodMetrics(metrics: Metric[]): string {
  const total = metrics.reduce(
    (acc, item) => ({
      views: acc.views + (item.view_count || 0),
      reviews: acc.reviews + (item.review_count || 0),
      followers: acc.followers + (item.new_followers || 0),
    }),
    { views: 0, reviews: 0, followers: 0 },
  );

  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-lg bg-white p-6 shadow">
        <p class="text-sm text-gray-600">Bu dönemde görüntülenme</p>
        <p class="mt-2 text-2xl font-bold">${total.views.toLocaleString('tr-TR')}</p>
      </div>
      <div class="rounded-lg bg-white p-6 shadow">
        <p class="text-sm text-gray-600">Bu dönemde inceleme</p>
        <p class="mt-2 text-2xl font-bold">${total.reviews.toLocaleString('tr-TR')}</p>
      </div>
      <div class="rounded-lg bg-white p-6 shadow">
        <p class="text-sm text-gray-600">Yeni takipçiler</p>
        <p class="mt-2 text-2xl font-bold">${total.followers.toLocaleString('tr-TR')}</p>
      </div>
    </div>
  `;
}

function renderActionSummary(data: BusinessAnalyticsData): string {
  const totalViews = data.metrics.reduce((sum, item) => sum + (item.view_count || 0), 0);
  const totalReviews = data.metrics.reduce((sum, item) => sum + (item.review_count || 0), 0);
  const totalFollowers = data.metrics.reduce((sum, item) => sum + (item.new_followers || 0), 0);

  let recommendation = 'Ziyaretçi trafiğiniz düzenli gidiyor. Yorum yanıt oranınızı yüksek tutmaya devam edin.';
  if (totalViews > 0 && totalReviews === 0) {
    recommendation = 'Görüntülenme alıyorsunuz ancak yeni yorum oluşmuyor. Ziyaret sonrası yorum isteme akışını güçlendirin.';
  } else if (totalFollowers === 0) {
    recommendation = 'Yeni takipçi kazanımı düşük. Profilinizi ve kampanya görünürlüğünü artıracak bir CTA ekleyin.';
  } else if (data.analytics.avgRating < 4.5) {
    recommendation = 'Ortalama puan hassas bölgede. Son yorumlara hızlı yanıt verip memnuniyet sinyallerini güçlendirin.';
  }

  return `
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/60">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Bugün neye odaklanmalısınız?</h3>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${recommendation}</p>
      <div class="mt-4 flex flex-wrap gap-3 text-sm">
        <a href="/profil/yorumlar" class="text-blue-700 transition-colors hover:text-blue-800">Yorumları aç</a>
        <a href="/fiyatlandirma" class="text-blue-700 transition-colors hover:text-blue-800">Reklam paketlerini incele</a>
      </div>
    </div>
  `;
}

function renderPeriodComparison(metrics: Metric[]): string {
  if (metrics.length < 2) return '';

  const midpoint = Math.ceil(metrics.length / 2);
  const current = metrics.slice(-midpoint);
  const previous = metrics.slice(0, Math.max(1, metrics.length - midpoint));

  const currentViews = current.reduce((sum, item) => sum + (item.view_count || 0), 0);
  const previousViews = previous.reduce((sum, item) => sum + (item.view_count || 0), 0);
  const delta = currentViews - previousViews;
  const tone = delta >= 0 ? 'text-green-700' : 'text-red-700';
  const label = delta >= 0 ? 'artış' : 'düşüş';

  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Dönem karşılaştırması</h3>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Son seçili dönem, önceki eşit pencereyle kıyaslandı.</p>
      <p class="mt-3 text-base font-semibold ${tone}">${Math.abs(delta).toLocaleString('tr-TR')} görüntülenme ${label}</p>
    </div>
  `;
}

function renderInsights(insights: Insight[]): string {
  if (insights.length === 0) return '';

  return `
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">AI önerileri</h3>
      ${insights
        .map((insight) => {
          const tone =
            insight.priority === 'high'
              ? 'border-red-500 bg-red-50'
              : insight.priority === 'medium'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-blue-500 bg-blue-50';
          return `
            <div class="rounded border-l-4 p-4 ${tone}">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h4 class="font-semibold">${insight.title}</h4>
                  <p class="mt-1 text-sm text-gray-700">${insight.description}</p>
                  <p class="mt-2 text-xs text-gray-600">Öneri: ${insight.action_recommendation}</p>
                  <p class="mt-1 text-xs text-gray-600">Beklenen etki: ${insight.estimated_impact}</p>
                </div>
                <button
                  type="button"
                  data-business-analytics-acknowledge="${insight.id}"
                  class="rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-100"
                >
                  Okudum
                </button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderTrends(metrics: Metric[]): string {
  if (metrics.length === 0) return '';

  return `
    <div class="rounded-lg bg-white p-6 shadow">
      <h3 class="mb-4 text-lg font-semibold">Günlük trendler</h3>
      <div class="space-y-2 text-sm">
        <p>${metrics.length} günlük veri bulundu</p>
        <p class="text-gray-500">Grafik görünümü yakında eklenecek</p>
      </div>
    </div>
  `;
}

export function renderBusinessAnalyticsDashboard(options: {
  placeId: string;
  days: number;
  data: BusinessAnalyticsData | null;
  insights: Insight[];
  error: string | null;
}): string {
  if (!options.placeId) {
    return renderEmptyState('Mekan seçilmedi.', 'p-4 text-center text-gray-500');
  }

  if (options.error) {
    return renderErrorState(options.error);
  }

  if (!options.data) {
    return renderEmptyState('İşletme analitiği yüklenemedi.', 'rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-600');
  }

  return `
    <div class="space-y-6">
      ${renderDayButtons(options.days)}
      ${renderAnalyticsCards(options.data.analytics)}
      ${renderPeriodMetrics(options.data.metrics)}
      ${renderActionSummary(options.data)}
      ${renderPeriodComparison(options.data.metrics)}
      ${renderInsights(options.insights)}
      ${renderTrends(options.data.metrics)}
    </div>
  `;
}
