export interface UserProfileData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface ActivityItem {
  id: number;
  userId: string;
  actionType: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type UserProfileTab = 'profile' | 'favorites' | 'activity' | 'settings' | 'security';

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractUserProfile(payload: unknown): UserProfileData | null {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;

  if (nested && typeof nested === 'object') {
    return nested as UserProfileData;
  }

  const profile = data.profile;
  return profile && typeof profile === 'object' ? (profile as UserProfileData) : null;
}

export function extractActivityItems(payload: unknown): ActivityItem[] {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;

  if (Array.isArray(nested)) {
    return nested as ActivityItem[];
  }

  if (nested && typeof nested === 'object' && Array.isArray((nested as { data?: unknown }).data)) {
    return (nested as { data: ActivityItem[] }).data;
  }

  return [];
}

export function extractProfileMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);

  if (typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
  }

  return fallback;
}

function getActivityIcon(actionType: string): string {
  switch (actionType) {
    case 'review_created':
      return '✍️';
    case 'favorite_added':
      return '❤️';
    case 'badge_earned':
      return '🏅';
    case 'level_up':
      return '⬆️';
    case 'comment_posted':
      return '💬';
    case 'points_earned':
      return '⭐';
    default:
      return '📌';
  }
}

function getActivityDescription(item: ActivityItem): string {
  switch (item.actionType) {
    case 'review_created':
      return `"${String(item.metadata?.placeName || 'bir yere')}" yorum yaptı`;
    case 'favorite_added':
      return `"${String(item.metadata?.placeName || 'bir yeri')}" favorilerine ekledi`;
    case 'badge_earned':
      return `"${String(item.metadata?.badgeName || 'Rozet')}" rozeti kazandı`;
    case 'level_up':
      return `Seviye ${String(item.metadata?.newLevel || '?')} oldu`;
    case 'comment_posted':
      return 'Blog yazısına yorum yaptı';
    case 'points_earned':
      return `${String(item.metadata?.points || 0)} puan kazandı`;
    default:
      return 'Bir eylem gerçekleştirdi';
  }
}

function renderTabs(activeTab: UserProfileTab): string {
  const tabs: Array<{ id: UserProfileTab; label: string; icon: string }> = [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'favorites', label: 'Favoriler', icon: '❤️' },
    { id: 'activity', label: 'Etkinlik Geçmişi', icon: '📊' },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
    { id: 'security', label: 'Güvenlik', icon: '🔒' },
  ];

  return `
    <div class="mb-8">
      <div class="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        ${tabs
          .map((tab) => {
            const active =
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300';
            return `
              <button
                type="button"
                data-user-profile-tab="${tab.id}"
                class="border-b-2 px-4 py-3 text-sm font-medium transition-colors ${active}"
              >
                <span class="mr-2">${tab.icon}</span>
                ${tab.label}
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderProfileTab(user: UserProfileData, saving: boolean, message: string | null): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <div class="space-y-6">
        ${message ? `<div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">${message}</div>` : ''}
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
          <input
            type="email"
            value="${user.email}"
            disabled
            class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-500">Doğrulanmış</p>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Ad Soyad</label>
          <input
            type="text"
            data-user-profile-full-name
            value="${user.full_name}"
            class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
          <input
            type="text"
            value="${user.role === 'user' ? 'Kullanıcı' : user.role}"
            disabled
            class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Katılım Tarihi</label>
          <input
            type="text"
            value="${new Date(user.created_at).toLocaleDateString('tr-TR')}"
            disabled
            class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          type="button"
          data-user-profile-save
          ${saving ? 'disabled' : ''}
          class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
        >
          ${saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  `;
}

function renderFavoritesTab(): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <div class="py-12 text-center text-gray-500 dark:text-gray-400">
          <p class="mb-2 text-lg">❤️</p>
          <p>Henüz favori yeriniz yok</p>
          <a href="/arama" class="mt-2 block text-blue-600 hover:underline">Yerleri keşfedin →</a>
        </div>
    </div>
  `;
}

function renderActivityTab(activity: ActivityItem[]): string {
  if (activity.length === 0) {
    return `
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
        <div class="py-12 text-center text-gray-500 dark:text-gray-400">
          <p class="mb-2 text-lg">📊</p>
          <p>Henüz bir aktivite yok</p>
          <a href="/arama" class="mt-2 block text-blue-600 hover:underline">Yerleri keşfedin ve yorum yazmaya başlayın →</a>
        </div>
      </div>
    `;
  }

  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <div class="space-y-4">
        ${activity
          .map(
            (item) => `
              <div class="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
                <span class="text-2xl">${getActivityIcon(item.actionType)}</span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 dark:text-white">${getActivityDescription(item)}</p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ${new Date(item.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderSettingsTab(): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <div class="space-y-6">
        <div>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Bildirim Tercihlerim</h3>
          <div class="space-y-3">
            <label class="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked class="rounded" />
              <span class="text-gray-700 dark:text-gray-300">Yorum bildirimleri</span>
            </label>
            <label class="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked class="rounded" />
              <span class="text-gray-700 dark:text-gray-300">Favori güncellemeleri</span>
            </label>
            <label class="flex cursor-pointer items-center gap-3">
              <input type="checkbox" class="rounded" />
              <span class="text-gray-700 dark:text-gray-300">Haftalık özet e-posta</span>
            </label>
          </div>
        </div>

        <button type="button" class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">
          Kaydet
        </button>
      </div>
    </div>
  `;
}

function renderSecurityTab(): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <div class="space-y-6">
        <div>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Şifremi Değiştir</h3>
          <div class="space-y-4">
            <input type="password" placeholder="Eski şifre" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input type="password" placeholder="Yeni şifre" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input type="password" placeholder="Yeni şifre (tekrar)" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <button type="button" class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">Şifreyi Güncelle</button>
          </div>
        </div>

        <hr class="border-gray-200 dark:border-gray-700" />

        <div>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Kişisel Verilerim</h3>
          <p class="mb-4 text-gray-600 dark:text-gray-400">Tüm kişisel verilerinizi indirin (KVKK kapsamı)</p>
          <a href="/api/export/user-data?format=json" class="inline-block rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition-colors hover:bg-gray-700">
            Verileri İndir
          </a>
        </div>
      </div>
    </div>
  `;
}

export function renderUserProfile(options: {
  user: UserProfileData | null;
  activity: ActivityItem[];
  activeTab: UserProfileTab;
  error: string | null;
  saving: boolean;
  message: string | null;
}): string {
  if (options.error) {
    return `
      <div class="container-custom py-12">
        <div class="rounded border border-red-300 bg-red-100 px-4 py-3 text-red-700">${options.error}</div>
      </div>
    `;
  }

  if (!options.user) {
    return '<div class="container-custom py-12 text-center text-gray-600">Yükleniyor...</div>';
  }

  let content = '';
  if (options.activeTab === 'profile') {
    content = renderProfileTab(options.user, options.saving, options.message);
  } else if (options.activeTab === 'favorites') {
    content = renderFavoritesTab();
  } else if (options.activeTab === 'activity') {
    content = renderActivityTab(options.activity);
  } else if (options.activeTab === 'settings') {
    content = renderSettingsTab();
  } else {
    content = renderSecurityTab();
  }

  return `
    <div class="container-custom py-12">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Profilim</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Profil bilgilerinizi ve tercihlerinizi yönetin</p>
      </div>
      ${renderTabs(options.activeTab)}
      ${content}
    </div>
  `;
}
