import { renderEmptyState } from './render-states';

export type VendorDashboardTab = 'overview' | 'listings' | 'reviews' | 'ads';

export interface VendorDashboardState {
  activeTab: VendorDashboardTab;
}

const tabs: Array<{ id: VendorDashboardTab; label: string }> = [
  { id: 'overview', label: 'Genel bakış' },
  { id: 'listings', label: 'İşletmelerim' },
  { id: 'reviews', label: 'Yorum yönetimi' },
  { id: 'ads', label: 'Reklam yönetimi' },
];

function renderTabs(activeTab: VendorDashboardTab): string {
  return `
    <div class="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
      ${tabs
        .map(
          (tab) => `
            <button
              type="button"
              data-vendor-dashboard-tab="${tab.id}"
              class="border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }"
            >
              ${tab.label}
            </button>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderOverview(): string {
  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div class="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-900/20 dark:to-blue-800/20">
        <p class="text-sm text-gray-600 dark:text-gray-400">Toplam görüntüleme</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">1,234</p>
      </div>
      <div class="rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-4 dark:from-green-900/20 dark:to-green-800/20">
        <p class="text-sm text-gray-600 dark:text-gray-400">Yorum yanıt oranı</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">85%</p>
      </div>
      <div class="rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 dark:from-yellow-900/20 dark:to-yellow-800/20">
        <p class="text-sm text-gray-600 dark:text-gray-400">Ortalama puan</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">4.7 ⭐</p>
      </div>
      <div class="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-4 dark:from-purple-900/20 dark:to-purple-800/20">
        <p class="text-sm text-gray-600 dark:text-gray-400">Aktif reklamlar</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">3</p>
      </div>
    </div>
  `;
}

function renderListings(): string {
  return `
    <div class="py-8 text-center text-gray-600 dark:text-gray-400">
      <div class="mb-4">${renderEmptyState('İşletmeleriniz burada listelenecek.', 'text-gray-600 dark:text-gray-400')}</div>
      <button class="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">+ İşletme ekle</button>
    </div>
  `;
}

function renderReviews(): string {
  return `
    <div class="space-y-4">
      <div class="border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p class="font-semibold text-gray-900 dark:text-white">Muhteşem hizmet!</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">⭐⭐⭐⭐⭐ - Örnek kullanıcı</p>
        <button class="mt-2 text-sm text-blue-600 hover:underline">Yanıt ver</button>
      </div>
    </div>
  `;
}

function renderAds(): string {
  return `
    <div class="py-8 text-center">
      <p class="mb-4 text-gray-600 dark:text-gray-400">Reklam kampanyalarınızı burada oluşturup yöneteceksiniz.</p>
      <button class="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">+ Reklam oluştur</button>
    </div>
  `;
}

export function renderVendorDashboard(state: VendorDashboardState): string {
  const tabBody =
    state.activeTab === 'overview'
      ? renderOverview()
      : state.activeTab === 'listings'
        ? renderListings()
        : state.activeTab === 'reviews'
          ? renderReviews()
          : renderAds();

  return `
    <div class="container-custom py-8">
      <h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-white">İşletme paneli</h1>
      ${renderTabs(state.activeTab)}
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        ${tabBody}
      </div>
    </div>
  `;
}
