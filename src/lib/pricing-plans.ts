export interface SubscriptionTierFeature {
  featureName: string;
  featureLimit?: number;
  description?: string;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  tierLevel: number;
  features?: SubscriptionTierFeature[];
}

export interface PricingPlansPayload {
  tiers: SubscriptionTier[];
  currentTier: string | null;
  selectedTier: string | null;
  isProcessing: boolean;
}

function renderPricingFeature(feature: SubscriptionTierFeature): string {
  return `
    <li class="flex items-start gap-2">
      <span class="mt-0.5 text-green-500">✓</span>
      <span class="text-sm text-gray-700 dark:text-gray-300">
        ${feature.featureName}
        ${feature.featureLimit ? `<span class="text-gray-500 dark:text-gray-400"> (${feature.featureLimit})</span>` : ''}
      </span>
    </li>
  `;
}

function getPricingCardClass(tier: SubscriptionTier, currentTier: string | null, isLoading: boolean) {
  const isCurrent = currentTier === tier.id;
  const isPopular = tier.tierLevel === 2;

  return `rounded-lg border-2 overflow-hidden transition-all ${
    isPopular
      ? 'border-blue-500 shadow-lg scale-105'
      : isCurrent
        ? 'border-green-500 shadow-md'
        : 'border-gray-200 hover:shadow-md dark:border-gray-700'
  } ${!isLoading ? 'cursor-pointer' : ''}`;
}

function renderPricingCard(
  tier: SubscriptionTier,
  currentTier: string | null,
  selectedTier: string | null,
  isProcessing: boolean,
): string {
  const isCurrent = currentTier === tier.id;
  const isPopular = tier.tierLevel === 2;
  const isLoading = isProcessing && selectedTier === tier.id;
  const features = tier.features || [];

  return `
    <div class="${getPricingCardClass(tier, currentTier, isLoading)}">
      ${isPopular ? '<div class="bg-blue-500 py-2 text-center text-sm font-bold text-white">⭐ En Popüler</div>' : ''}
      ${isCurrent ? '<div class="bg-green-500 py-2 text-center text-sm font-bold text-white">✓ Mevcut Plan</div>' : ''}
      <div class="p-6">
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${tier.displayName}</h3>
        ${tier.description ? `<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${tier.description}</p>` : ''}

        <div class="mb-6 mt-6">
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-bold text-gray-900 dark:text-white">₺${tier.monthlyPrice.toFixed(0)}</span>
            <span class="text-gray-600 dark:text-gray-400">/ay</span>
          </div>
          ${
            tier.annualPrice
              ? `<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">veya ₺${tier.annualPrice.toFixed(0)}/yıl (${(tier.annualPrice / 12).toFixed(0)}₺/ay)</p>`
              : ''
          }
        </div>

        ${
          features.length > 0
            ? `
              <ul class="mb-6 space-y-3">
                ${features.slice(0, 5).map(renderPricingFeature).join('')}
                ${features.length > 5 ? `<li class="text-sm italic text-gray-600 dark:text-gray-400">+ ${features.length - 5} özellik daha</li>` : ''}
              </ul>
            `
            : ''
        }

        <button
          data-pricing-select="${tier.id}"
          ${isLoading || isCurrent ? 'disabled' : ''}
          class="w-full rounded-lg py-3 font-medium transition-colors ${
            isCurrent
              ? 'cursor-not-allowed bg-gray-200 text-gray-700'
              : isPopular
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }"
        >
          ${
            isLoading
              ? 'İşleniyor...'
              : isCurrent
                ? 'Mevcut Plan'
                : 'Seç'
          }
        </button>
      </div>
    </div>
  `;
}

export function renderPricingPlans(payload: PricingPlansPayload): string {
  return `
    <div class="grid gap-6 md:grid-cols-4">
      ${payload.tiers
        .map((tier) =>
          renderPricingCard(tier, payload.currentTier, payload.selectedTier, payload.isProcessing),
        )
        .join('')}
    </div>
  `;
}

export function renderPricingError(message: string): string {
  return `
    <div class="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
      <p class="text-red-700 dark:text-red-300">${message}</p>
    </div>
  `;
}
