export interface RewardCatalogItem {
  id: string;
  reward_name: string;
  description?: string;
  category?: string;
  points_cost: number;
  image_url?: string;
  available_stock?: number | null;
}

export interface PromotionalOfferItem {
  id: string;
  offer_name: string;
  reward_id?: string;
  points_discount?: number;
  discount_percent?: number;
  valid_from: string;
  valid_until: string;
}

export interface RewardsCatalogState {
  rewards: RewardCatalogItem[];
  promos: PromotionalOfferItem[];
  selectedCategory: string;
  redeemingRewardId?: string | null;
  message?: {
    type: 'success' | 'error';
    text: string;
  } | null;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (nestedData && typeof nestedData === 'object') {
      return nestedData as Record<string, unknown>;
    }

    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractRewardsCatalog(payload: unknown): {
  rewards: RewardCatalogItem[];
  promos: PromotionalOfferItem[];
} {
  const data = resolveEnvelopeData(payload);
  const rewards = Array.isArray(data.rewards) ? (data.rewards as RewardCatalogItem[]) : [];
  const promos = Array.isArray(data.promotionalOffers)
    ? (data.promotionalOffers as PromotionalOfferItem[])
    : [];

  return { rewards, promos };
}

export function extractRewardRedemption(payload: unknown): {
  redemptionCode: string | null;
  message: string;
} {
  const data = resolveEnvelopeData(payload);
  const redemptionCode = typeof data.redemptionCode === 'string' ? data.redemptionCode : null;
  const message =
    typeof data.message === 'string' && data.message.trim().length > 0
      ? data.message
      : 'Ödül başarıyla kazanıldı';

  return { redemptionCode, message };
}

export function extractRewardsErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }

    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }
  }

  return fallback;
}

export function getRewardCategories(rewards: RewardCatalogItem[]): string[] {
  return Array.from(new Set(rewards.map((reward) => reward.category).filter(Boolean) as string[]));
}

function formatPromoDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function renderPromotionalOffers(promos: PromotionalOfferItem[]): string {
  if (promos.length === 0) return '';

  return `
    <div class="rounded-lg border border-orange-200 bg-gradient-to-r from-red-50 to-orange-50 p-4">
      <h3 class="mb-3 font-semibold text-orange-900">🎉 Özel Teklifler</h3>
      <div class="space-y-2">
        ${promos
          .map((promo) => {
            const discountLabel =
              typeof promo.points_discount === 'number'
                ? `-${promo.points_discount} puan`
                : typeof promo.discount_percent === 'number'
                  ? `-%${promo.discount_percent}`
                  : '';

            return `
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-sm">${promo.offer_name}</p>
                  <p class="text-xs text-orange-700">
                    Geçerli: ${formatPromoDate(promo.valid_from)} - ${formatPromoDate(promo.valid_until)}
                  </p>
                </div>
                <span class="text-sm font-bold text-orange-600">${discountLabel}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderMessage(message?: RewardsCatalogState['message']): string {
  if (!message) return '';

  const wrapperClass =
    message.type === 'success'
      ? 'rounded-lg border border-green-200 bg-green-50 p-4'
      : 'rounded-lg border border-red-200 bg-red-50 p-4';
  const textClass = message.type === 'success' ? 'text-green-800' : 'text-red-800';

  return `
    <div class="${wrapperClass}">
      <p class="${textClass}">${message.text}</p>
    </div>
  `;
}

function renderCategoryFilter(rewards: RewardCatalogItem[], selectedCategory: string): string {
  const categories = getRewardCategories(rewards);
  if (categories.length === 0) return '';

  const allButtonClass =
    selectedCategory === 'all'
      ? 'bg-blue-600 text-white'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  return `
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        data-reward-category="all"
        class="rounded-lg px-4 py-2 font-medium transition ${allButtonClass}"
      >Tüm ödüller</button>
      ${categories
        .map((category) => {
          const className =
            selectedCategory === category
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

          return `
            <button
              type="button"
              data-reward-category="${category}"
              class="rounded-lg px-4 py-2 font-medium capitalize transition ${className}"
            >${category}</button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderRewardCard(state: RewardsCatalogState, reward: RewardCatalogItem): string {
  const stock = typeof reward.available_stock === 'number' ? reward.available_stock : null;
  const isOutOfStock = stock !== null && stock <= 0;
  const isRedeeming = state.redeemingRewardId === reward.id;
  const buttonClass = isOutOfStock
    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
    : isRedeeming
      ? 'bg-blue-400 text-white cursor-wait'
      : 'bg-blue-600 text-white hover:bg-blue-700';
  const buttonLabel = isRedeeming ? 'İşleniyor...' : 'Puan kullan';

  return `
    <div class="overflow-hidden rounded-lg bg-white shadow-md transition hover:shadow-lg">
      ${reward.image_url ? `<img src="${reward.image_url}" alt="${reward.reward_name}" class="h-48 w-full object-cover" />` : ''}
      <div class="p-4">
        <h3 class="mb-1 text-lg font-semibold">${reward.reward_name}</h3>
        <p class="mb-3 text-sm text-gray-600">${reward.description ?? ''}</p>
        <div class="mb-4 flex items-center justify-between gap-3">
          <span class="text-2xl font-bold text-blue-600">${reward.points_cost.toLocaleString('tr-TR')}</span>
          <span class="rounded bg-gray-100 px-2 py-1 text-xs">${reward.category ?? 'genel kategori'}</span>
        </div>
        ${isOutOfStock ? '<div class="mb-2 text-sm font-medium text-red-600">Tükenmiş</div>' : ''}
        ${stock !== null && stock > 0 ? `<p class="mb-3 text-xs text-gray-500">${stock} adet kaldı</p>` : ''}
        <button
          type="button"
          data-reward-redeem="${reward.id}"
          ${isOutOfStock || isRedeeming ? 'disabled' : ''}
          class="w-full rounded-lg py-2 font-medium transition ${buttonClass}"
        >${buttonLabel}</button>
      </div>
    </div>
  `;
}

export function renderRewardsCatalog(state: RewardsCatalogState): string {
  const filteredRewards =
    state.selectedCategory === 'all'
      ? state.rewards
      : state.rewards.filter((reward) => reward.category === state.selectedCategory);

  let rewardsSection = '';
  if (filteredRewards.length === 0) {
    rewardsSection = `
      <div class="py-12 text-center text-gray-500">
        <p class="text-lg">Bu kategoride ödül bulunamadı.</p>
      </div>
    `;
  } else {
    rewardsSection = `
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${filteredRewards.map((reward) => renderRewardCard(state, reward)).join('')}
      </div>
    `;
  }

  return `
    <div class="space-y-6">
      ${renderPromotionalOffers(state.promos)}
      ${renderMessage(state.message)}
      ${renderCategoryFilter(state.rewards, state.selectedCategory)}
      ${rewardsSection}
    </div>
  `;
}

export function renderRewardsCatalogError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="text-red-800">${message}</p>
    </div>
  `;
}
