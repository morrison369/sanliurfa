import type { AdminSubscriptionAnalyticsData } from '../types/admin-api';

export type SubscriptionAdminTab = 'overview' | 'users' | 'webhooks';

export function normalizeSubscriptionAdminTab(value: string | null | undefined): SubscriptionAdminTab {
  return value === 'users' || value === 'webhooks' ? value : 'overview';
}

export function extractSubscriptionAdminAnalytics(
  payload: AdminSubscriptionAnalyticsData | null | undefined,
): AdminSubscriptionAnalyticsData | null {
  if (!payload || typeof payload !== 'object') return null;
  if ('subscriptions' in payload && 'webhooks' in payload) return payload;

  const directData = (payload as { data?: unknown }).data;
  if (directData && typeof directData === 'object' && 'subscriptions' in directData && 'webhooks' in directData) {
    return directData as AdminSubscriptionAnalyticsData;
  }

  const nestedData =
    directData && typeof directData === 'object' ? (directData as { data?: unknown }).data : null;
  if (nestedData && typeof nestedData === 'object' && 'subscriptions' in nestedData && 'webhooks' in nestedData) {
    return nestedData as AdminSubscriptionAnalyticsData;
  }

  return null;
}

function renderTabButton(tab: SubscriptionAdminTab, activeTab: SubscriptionAdminTab): string {
  const label = tab === 'overview' ? 'Özet' : tab === 'users' ? 'Kullanıcılar' : "Webhook'lar";
  const classes =
    activeTab === tab
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300';

  return `<button type="button" data-subscription-admin-tab="${tab}" class="border-b-2 px-4 py-2 font-medium transition ${classes}">${label}</button>`;
}

function renderOverview(analytics: AdminSubscriptionAnalyticsData): string {
  const mrrDisplay = analytics.subscriptions.mrr.toFixed(2);
  const arrDisplay = analytics.subscriptions.arr.toFixed(2);
  const churnDisplay = analytics.subscriptions.churnRate.toFixed(1);

  return `
    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-4">
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Abonelik</h3>
          <p class="text-3xl font-bold text-gray-900 dark:text-white">${analytics.subscriptions.totalSubscriptions}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Aktif</h3>
          <p class="text-3xl font-bold text-green-600 dark:text-green-400">${analytics.subscriptions.activeSubscriptions}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Aylık Gelir (MRR)</h3>
          <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">₺${mrrDisplay}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Kaybedilen Abonelik Oranı</h3>
          <p class="text-3xl font-bold text-red-600 dark:text-red-400">${churnDisplay}%</p>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Plan Dağılımı</h3>
        <div class="space-y-3">
          ${Object.entries(analytics.subscriptions.byTier)
            .map(([tier, count]) => {
              const width = analytics.subscriptions.activeSubscriptions
                ? (count / analytics.subscriptions.activeSubscriptions) * 100
                : 0;
              return `
                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">${tier}</span>
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div class="h-full bg-blue-600" style="width: ${width}%"></div>
                    </div>
                    <span class="w-12 text-right font-semibold text-gray-900 dark:text-white">${count}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-6 dark:border-green-800 dark:from-green-900/20 dark:to-blue-900/20">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Gelir Özeti</h3>
        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <p class="mb-1 text-sm text-gray-600 dark:text-gray-400">Aylık Gelir (MRR)</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">₺${mrrDisplay}</p>
          </div>
          <div>
            <p class="mb-1 text-sm text-gray-600 dark:text-gray-400">Yıllık Değerleme (ARR)</p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">₺${arrDisplay}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderUsersTab(): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Kullanıcı yönetimi</h3>
      <p class="mb-4 text-gray-600 dark:text-gray-400">
        Kullanıcıların abonelik durumunu ve planlarını yönetin. Aşağıdaki bağlantıyla ayrıntılı yönetim sayfasına gidin.
      </p>
      <a href="/admin/subscriptions/users" class="inline-block rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700">
        Kullanıcı yönetim paneline git →
      </a>
    </div>
  `;
}

function renderWebhooksTab(analytics: AdminSubscriptionAnalyticsData): string {
  return `
    <div class="space-y-4">
      <div class="grid gap-4 md:grid-cols-4">
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Başarılı</h3>
          <p class="text-3xl font-bold text-green-600">${analytics.webhooks?.successful || 0}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Beklemede</h3>
          <p class="text-3xl font-bold text-yellow-600">${analytics.webhooks?.pending || 0}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Yeniden Deniyor</h3>
          <p class="text-3xl font-bold text-blue-600">${analytics.webhooks?.retrying || 0}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Başarısız</h3>
          <p class="text-3xl font-bold text-red-600">${analytics.webhooks?.failed || 0}</p>
        </div>
      </div>

      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p class="text-sm text-blue-800 dark:text-blue-300">
          Webhook iletim durumunu izleyin. Başarısız webhook'lar işleniyor ve otomatik olarak yeniden deneniyor.
        </p>
      </div>
    </div>
  `;
}

export function renderSubscriptionAdminDashboard(options: {
  analytics: AdminSubscriptionAnalyticsData | null;
  error: string | null;
  activeTab: SubscriptionAdminTab;
}): string {
  if (options.error) {
    return `<div class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"><p class="text-red-700 dark:text-red-300">${options.error}</p></div>`;
  }

  if (!options.analytics) {
    return `<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800"><p class="text-gray-600 dark:text-gray-400">Veriler yüklenemedi</p></div>`;
  }

  return `
    <div class="space-y-6">
      <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        ${(['overview', 'users', 'webhooks'] as const)
          .map((tab) => renderTabButton(tab, options.activeTab))
          .join('')}
      </div>
      ${
        options.activeTab === 'users'
          ? renderUsersTab()
          : options.activeTab === 'webhooks'
            ? renderWebhooksTab(options.analytics)
            : renderOverview(options.analytics)
      }
    </div>
  `;
}
