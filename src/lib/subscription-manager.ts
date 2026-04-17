export interface ActiveSubscription {
  id: string;
  tier: {
    id?: string;
    displayName: string;
    monthlyPrice: number;
  };
  status: string;
  startDate: string;
  nextBillingDate?: string;
  autoRenew: boolean;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractSubscription(payload: unknown): ActiveSubscription | null {
  const data = resolveEnvelopeData(payload);
  const subscription = data.subscription;
  return subscription && typeof subscription === 'object'
    ? (subscription as ActiveSubscription)
    : null;
}

export function extractSubscriptionMessage(payload: unknown, fallback: string): string {
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

function renderSubscriptionError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="text-red-700">${message}</p>
    </div>
  `;
}

function renderUpgradeCta(): string {
  return `
    <div class="rounded-lg border-2 border-blue-300 bg-blue-50 p-6">
      <h3 class="mb-2 text-lg font-semibold text-gray-900">Premium'a yükselt</h3>
      <p class="mb-4 text-gray-600">Premium özellikleri keşfedin ve daha fazla avantaj alın.</p>
      <a href="/fiyatlandirma" class="inline-flex rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">Planları gör</a>
    </div>
  `;
}

function renderSubscriptionCard(subscription: ActiveSubscription, cancelling: boolean): string {
  const daysUntilBilling = subscription.nextBillingDate
    ? Math.ceil((new Date(subscription.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Aktif plan</h3>
          <p class="mt-1 text-gray-600">${subscription.tier.displayName}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-gray-900">₺${subscription.tier.monthlyPrice.toFixed(0)}</p>
          <p class="text-sm text-gray-600">aylık</p>
        </div>
      </div>

      <div class="mb-6 space-y-3 border-b border-gray-200 pb-6">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Başlangıç tarihi</span>
          <span class="text-sm font-medium text-gray-900">${new Date(subscription.startDate).toLocaleDateString('tr-TR')}</span>
        </div>
        ${subscription.nextBillingDate ? `
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Sonraki ödeme</span>
            <span class="text-sm font-medium text-gray-900">
              ${new Date(subscription.nextBillingDate).toLocaleDateString('tr-TR')}
              ${daysUntilBilling && daysUntilBilling > 0 ? `<span class="ml-2 text-gray-500">(${daysUntilBilling} gün)</span>` : ''}
            </span>
          </div>
        ` : ''}
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Otomatik yenileme</span>
          <span class="text-sm font-medium ${subscription.autoRenew ? 'text-green-600' : 'text-gray-600'}">${subscription.autoRenew ? 'Aktif' : 'Pasif'}</span>
        </div>
      </div>

      <div class="flex gap-3">
        <a href="/fiyatlandirma" class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700">Yükselt</a>
        <button type="button" data-subscription-cancel ${cancelling ? 'disabled' : ''} class="flex-1 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-200 disabled:bg-gray-200">
          ${cancelling ? 'İptal ediliyor...' : 'Aboneliği iptal et'}
        </button>
      </div>
    </div>
  `;
}

export function renderSubscriptionManager(options: {
  subscription: ActiveSubscription | null;
  error: string | null;
  cancelling: boolean;
}): string {
  if (options.error) {
    return renderSubscriptionError(options.error);
  }

  if (!options.subscription) {
    return renderUpgradeCta();
  }

  return renderSubscriptionCard(options.subscription, options.cancelling);
}
