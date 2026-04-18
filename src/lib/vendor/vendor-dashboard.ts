import { renderEmptyState } from '../shared/render-states';

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
    <div class="space-y-6">
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

      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Hızlı aksiyonlar</h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">İşletmenizi büyütmek için en sık kullanılan adımlara buradan geçin.</p>
        <div class="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="#listings" data-vendor-dashboard-shortcut="listings" class="rounded-lg border border-blue-200 bg-white px-4 py-2 text-blue-700 transition-colors hover:bg-blue-50">İşletme ekle</a>
          <a href="#reviews" data-vendor-dashboard-shortcut="reviews" class="rounded-lg border border-blue-200 bg-white px-4 py-2 text-blue-700 transition-colors hover:bg-blue-50">Yorumları yanıtla</a>
          <a href="#ads" data-vendor-dashboard-shortcut="ads" class="rounded-lg border border-blue-200 bg-white px-4 py-2 text-blue-700 transition-colors hover:bg-blue-50">Reklam oluştur</a>
        </div>
      </div>
    </div>
  `;
}

function renderListings(): string {
  return `
    <div class="py-8 text-center text-gray-600 dark:text-gray-400">
      <div class="mb-4">${renderEmptyState('Henüz eklenmiş işletme bulunmuyor.', 'text-gray-600 dark:text-gray-400')}</div>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">İlk işletmenizi ekleyerek yorum, görüntüleme ve reklam performansını tek panelden yönetebilirsiniz.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <a href="/places/ekle" class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700">+ İşletme ekle</a>
        <a href="/hakkinda" class="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">Nasıl çalışır?</a>
      </div>
    </div>
  `;
}

function renderReviews(): string {
  return `
    <div class="space-y-4">
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p class="text-sm text-gray-600 dark:text-gray-400">Yanıt bekleyen yorum</p>
        <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">1</p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Yeni yorum geldiğinde hızlı yanıt vermek görünürlüğünüzü artırır.</p>
      </div>
      <div class="border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p class="font-semibold text-gray-900 dark:text-white">Muhteşem hizmet!</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">⭐⭐⭐⭐⭐ - Örnek kullanıcı</p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Bu yoruma yanıt vererek ziyaretçilere aktif olduğunuzu gösterebilirsiniz.</p>
        <div class="mt-3 flex flex-wrap gap-3 text-sm">
          <button class="text-blue-600 hover:underline">Yanıt ver</button>
          <a href="/profil/yorumlar" class="text-blue-600 hover:underline">Tüm yorumları aç</a>
        </div>
      </div>
    </div>
  `;
}

function renderAds(): string {
  return `
    <div class="py-8 text-center">
      <p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Reklam kampanyalarınızı burada oluşturup yöneteceksiniz.</p>
      <p class="mb-4 text-gray-600 dark:text-gray-400">Yeni ziyaretçi çekmek veya öne çıkan işletmeler arasında görünmek için ilk kampanyanızı başlatın.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <button class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700">+ Reklam oluştur</button>
        <a href="/fiyatlandirma" class="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">Paketleri incele</a>
      </div>
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
