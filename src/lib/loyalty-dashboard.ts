export interface LoyaltyBalance {
  total_points: number;
  available_points: number;
  current_tier: string;
  lifetime_points: number;
}

export interface LoyaltyTier {
  tier_name: string;
  tier_level: number;
  min_points: number;
  point_multiplier: number;
}

export interface LoyaltyAchievements {
  total_unlocked: number;
  total_available: number;
  unlock_percentage: number;
}

export interface LoyaltyDashboardData {
  balance: LoyaltyBalance;
  tiers: LoyaltyTier[];
  achievements: LoyaltyAchievements;
}

export type LoyaltyDashboardTab = 'overview' | 'rewards' | 'achievements';

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractLoyaltyDashboardData(payload: unknown): LoyaltyDashboardData | null {
  const data = resolveEnvelopeData(payload);
  const nested = data.data;

  if (!nested || typeof nested !== 'object') return null;

  const loyalty = nested as Partial<LoyaltyDashboardData>;
  if (!loyalty.balance || !loyalty.tiers || !loyalty.achievements) {
    return null;
  }

  return loyalty as LoyaltyDashboardData;
}

export function extractLoyaltyMessage(payload: unknown, fallback: string): string {
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

function renderHeader(data: LoyaltyDashboardData): string {
  return `
    <div class="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white shadow">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="mb-2 text-3xl font-bold">Sadakat Programı</h1>
          <p class="text-blue-100">Harcadığınız her para için puan kazanın ve özel ödüller açın</p>
        </div>
        <span class="text-5xl opacity-80">🏆</span>
      </div>

      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-lg bg-white/10 p-4">
          <div class="mb-1 text-sm text-blue-100">Toplam Puan</div>
          <div class="text-3xl font-bold">${data.balance.total_points.toLocaleString('tr-TR')}</div>
        </div>
        <div class="rounded-lg bg-white/10 p-4">
          <div class="mb-1 text-sm text-blue-100">Kullanılabilir Puan</div>
          <div class="text-3xl font-bold">${data.balance.available_points.toLocaleString('tr-TR')}</div>
        </div>
        <div class="rounded-lg bg-white/10 p-4">
          <div class="mb-1 text-sm text-blue-100">Mevcut Seviye</div>
          <div class="text-3xl font-bold capitalize">${data.balance.current_tier}</div>
        </div>
      </div>
    </div>
  `;
}

function renderTierProgress(data: LoyaltyDashboardData): string {
  const currentTier = data.tiers.find((tier) => tier.tier_name === data.balance.current_tier);
  const nextTier = data.tiers.find((tier) => tier.tier_level === (currentTier?.tier_level || 0) + 1);

  if (!nextTier) return '';

  const pointsToNextTier = Math.max(nextTier.min_points - data.balance.total_points, 0);
  const progress = Math.min((data.balance.total_points / nextTier.min_points) * 100, 100);

  return `
    <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <h2 class="mb-4 text-xl font-semibold">Sonraki Seviyeye İlerle</h2>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="font-medium capitalize">${data.balance.current_tier}</span>
          <span class="text-sm text-gray-600 dark:text-gray-400">${pointsToNextTier.toLocaleString('tr-TR')} puan kaldı</span>
        </div>
        <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all" style="width: ${progress}%"></div>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span>${data.balance.total_points.toLocaleString('tr-TR')}</span>
          <span class="font-semibold">${nextTier.min_points.toLocaleString('tr-TR')}</span>
        </div>
      </div>
    </div>
  `;
}

function renderTabs(activeTab: LoyaltyDashboardTab): string {
  const items: Array<{ key: LoyaltyDashboardTab; icon: string; label: string }> = [
    { key: 'overview', icon: '📈', label: 'Genel Bakış' },
    { key: 'rewards', icon: '🎁', label: 'Ödüller' },
    { key: 'achievements', icon: '⭐', label: 'Başarılar' },
  ];

  return `
    <div class="border-b border-gray-200 dark:border-gray-700">
      <div class="flex gap-8">
        ${items
          .map((item) => {
            const active =
              item.key === activeTab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300';
            return `
              <button
                type="button"
                data-loyalty-tab="${item.key}"
                class="border-b-2 px-1 py-3 font-medium transition-colors ${active}"
              >
                <span class="flex items-center gap-2">
                  <span>${item.icon}</span>
                  <span>${item.label}</span>
                </span>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderOverviewTab(data: LoyaltyDashboardData): string {
  return `
    <div class="space-y-6">
      <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h3 class="mb-4 text-lg font-semibold">Seviye Avantajları</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          ${data.tiers
            .map((tier) => {
              const current = data.balance.current_tier === tier.tier_name;
              const classes = current
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700';
              return `
                <div class="rounded-lg border-2 p-4 transition-all ${classes}">
                  <div class="mb-2 flex items-start justify-between">
                    <div>
                      <h4 class="font-semibold capitalize">${tier.tier_name}</h4>
                      <p class="text-sm text-gray-600 dark:text-gray-400">${tier.min_points.toLocaleString('tr-TR')}+ puan</p>
                    </div>
                    ${current ? '<span class="rounded bg-blue-600 px-2 py-1 text-xs text-white">Mevcut</span>' : ''}
                  </div>
                  <div class="text-sm font-medium text-blue-600">${(tier.point_multiplier * 100).toFixed(0)}% bonus</div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="mb-2 flex items-center gap-3">
            <span class="text-2xl text-yellow-500">⚡</span>
            <div class="text-sm text-gray-600 dark:text-gray-400">Yaşam Süresi Puanları</div>
          </div>
          <div class="text-3xl font-bold">${data.balance.lifetime_points.toLocaleString('tr-TR')}</div>
        </div>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="mb-2 flex items-center gap-3">
            <span class="text-2xl text-purple-500">⭐</span>
            <div class="text-sm text-gray-600 dark:text-gray-400">Başarılar</div>
          </div>
          <div class="text-3xl font-bold">${data.achievements.total_unlocked.toLocaleString('tr-TR')}</div>
          <div class="mt-1 text-xs text-gray-500">
            ${(data.achievements.total_available - data.achievements.total_unlocked).toLocaleString('tr-TR')} kalmadı
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRewardsTab(): string {
  return `
    <div class="rounded-lg bg-white p-6 text-center shadow dark:bg-gray-800">
      <div class="mb-4 text-5xl text-gray-400">🎁</div>
      <p class="mb-4 text-gray-600 dark:text-gray-400">Puanlarınızı harika ödüllere dönüştürün</p>
      <a href="/loyalty/rewards" class="inline-flex rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700">
        Ödülleri İncele
      </a>
    </div>
  `;
}

function renderAchievementsTab(data: LoyaltyDashboardData): string {
  return `
    <div class="space-y-4">
      <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div class="mb-6 text-center">
          <div class="mb-2 text-5xl font-bold text-blue-600">${data.achievements.unlock_percentage.toLocaleString('tr-TR')}%</div>
          <p class="text-gray-600 dark:text-gray-400">
            ${data.achievements.total_unlocked.toLocaleString('tr-TR')} / ${data.achievements.total_available.toLocaleString('tr-TR')} başarıyı açtınız
          </p>
        </div>
        <div class="h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all" style="width: ${data.achievements.unlock_percentage}%"></div>
        </div>
      </div>
      <div class="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-purple-900/20">
        <h4 class="mb-2 font-semibold">💡 İpucu</h4>
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Daha fazla başarıyı açmak için tesisler hakkında incelemeler yazın ve favori ekleyin.
        </p>
      </div>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    <div class="py-8 text-center text-gray-500">
      ${message}
    </div>
  `;
}

export function renderLoyaltyDashboard(options: {
  data: LoyaltyDashboardData | null;
  error: string | null;
  activeTab: LoyaltyDashboardTab;
}): string {
  if (options.error) {
    return renderError(options.error);
  }

  if (!options.data) {
    return renderError('Sadakat bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
  }

  let tabContent = '';
  if (options.activeTab === 'overview') {
    tabContent = renderOverviewTab(options.data);
  } else if (options.activeTab === 'rewards') {
    tabContent = renderRewardsTab();
  } else {
    tabContent = renderAchievementsTab(options.data);
  }

  return `
    <div class="space-y-6">
      ${renderHeader(options.data)}
      ${renderTierProgress(options.data)}
      ${renderTabs(options.activeTab)}
      ${tabContent}
    </div>
  `;
}
