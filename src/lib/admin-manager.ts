export type AdminManagerTab = 'places' | 'reviews' | 'users';

export interface AdminManagerTabConfig {
  id: AdminManagerTab;
  label: string;
  icon: string;
}

const RESOURCE_TABS: AdminManagerTabConfig[] = [
  { id: 'places', label: 'Yerler', icon: '📍' },
  { id: 'reviews', label: 'Yorumlar', icon: '⭐' },
  { id: 'users', label: 'Kullanıcılar', icon: '👥' },
];

export function getAdminManagerTabs(): AdminManagerTabConfig[] {
  return RESOURCE_TABS;
}

export function normalizeAdminManagerTab(value: string | null | undefined): AdminManagerTab {
  return value === 'reviews' || value === 'users' ? value : 'places';
}

function renderTabButton(tab: AdminManagerTabConfig, activeTab: AdminManagerTab): string {
  const active =
    activeTab === tab.id
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-600 dark:text-gray-400';

  return `
    <button
      type="button"
      data-admin-manager-tab="${tab.id}"
      class="px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active}"
    >
      ${tab.icon} ${tab.label}
    </button>
  `;
}

function renderPlacesManager(): string {
  return `
    <div class="p-6">
      <div class="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Yer adı ara..."
          class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700">
          + Yeni Yer
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Adı</th>
              <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Kategori</th>
              <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Puan</th>
              <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Durum</th>
              <th class="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">İşlemler</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">Göbeklitepe</td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-400">Tarihi</td>
              <td class="px-6 py-3 text-gray-600 dark:text-gray-400">4.8 ⭐</td>
              <td class="px-6 py-3"><span class="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">Yayında</span></td>
              <td class="px-6 py-3 text-right">
                <button class="mr-3 text-sm text-blue-600 hover:underline">Düzenle</button>
                <button class="text-sm text-red-600 hover:underline">Sil</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 text-sm text-gray-600 dark:text-gray-400">Toplam: 1 yer</div>
    </div>
  `;
}

function renderReviewsManager(): string {
  return `
    <div class="p-6">
      <div class="mb-6">
        <input
          type="text"
          placeholder="Yorum ara..."
          class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Kullanıcı</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Yer</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Puan</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Durum</th>
            <th class="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">İşlemler</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">User123</td>
            <td class="px-6 py-3 text-gray-600 dark:text-gray-400">Balıklıgöl</td>
            <td class="px-6 py-3 text-gray-600 dark:text-gray-400">5 ⭐</td>
            <td class="px-6 py-3"><span class="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">Onaylandı</span></td>
            <td class="px-6 py-3 text-right">
              <button class="text-sm text-red-600 hover:underline">Reddet</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderUsersManager(): string {
  return `
    <div class="p-6">
      <div class="mb-6">
        <input
          type="text"
          placeholder="Kullanıcı ara..."
          class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">E-posta</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Rol</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Katılım</th>
            <th class="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">İşlemler</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">user@example.com</td>
            <td class="px-6 py-3 text-gray-600 dark:text-gray-400">Kullanıcı</td>
            <td class="px-6 py-3 text-gray-600 dark:text-gray-400">2 gün önce</td>
            <td class="px-6 py-3 text-right">
              <button class="mr-3 text-sm text-blue-600 hover:underline">Düzenle</button>
              <button class="text-sm text-red-600 hover:underline">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

export function renderAdminManager(activeTab: AdminManagerTab): string {
  return `
    <div class="container-custom py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Yönetim Paneli</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Yerler, yorumlar ve kullanıcıları yönet</p>
      </div>

      <div class="mb-6">
        <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          ${RESOURCE_TABS.map((tab) => renderTabButton(tab, activeTab)).join('')}
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        ${
          activeTab === 'reviews'
            ? renderReviewsManager()
            : activeTab === 'users'
              ? renderUsersManager()
              : renderPlacesManager()
        }
      </div>
    </div>
  `;
}
