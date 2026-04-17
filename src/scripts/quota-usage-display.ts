import { setElementHtml, setElementClassName } from '../lib/admin-dom';
import {
  formatQuotaResetDate,
  getQuotaProgressColor,
  getQuotaWarningClass,
  type QuotaItem,
  type QuotaResponse,
} from '../lib/quota-usage';

type QuotaRoot = HTMLElement & {
  dataset: DOMStringMap;
};

function renderCompactQuota(quota: QuotaItem): string {
  return `
    <div class="rounded-lg border p-3 ${getQuotaWarningClass(quota.percentageUsed)}">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-900 dark:text-white">${quota.feature}</span>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-400">${quota.current}/${quota.limit}</span>
      </div>
      <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div class="h-2 rounded-full transition-all ${getQuotaProgressColor(quota.percentageUsed)}" style="width: ${Math.min(quota.percentageUsed, 100)}%"></div>
      </div>
      <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">${quota.message}</p>
    </div>
  `;
}

function renderFullQuota(quota: QuotaItem): string {
  const limitedMeta =
    quota.limit !== null
      ? `
        <span class="text-sm font-semibold text-gray-600 dark:text-gray-400">
          ${quota.current}/${quota.limit}
        </span>
      `
      : '';

  const body =
    quota.limit !== null
      ? `
        <div class="mb-2 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            class="h-2.5 rounded-full transition-all ${getQuotaProgressColor(quota.percentageUsed)}"
            style="width: ${Math.min(quota.percentageUsed, 100)}%"
          ></div>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>${quota.percentageUsed}% kullanılmış</span>
          ${quota.resetDate ? `<span>Sıfırlanma: ${formatQuotaResetDate(quota.resetDate)}</span>` : ''}
        </div>
      `
      : `
        <p class="text-sm text-green-600 dark:text-green-400">Sınırsız ✓</p>
      `;

  return `
    <div class="rounded-lg border p-4 ${getQuotaWarningClass(quota.percentageUsed)}">
      <div class="mb-2 flex items-center justify-between">
        <div>
          <h4 class="font-medium text-gray-900 dark:text-white">${quota.feature}</h4>
          ${quota.limit !== null ? `<p class="text-sm text-gray-600 dark:text-gray-400">${quota.message}</p>` : ''}
        </div>
        ${limitedMeta}
      </div>
      ${body}
    </div>
  `;
}

function renderQuotaContent(data: QuotaResponse, compact: boolean): string {
  if (!data || data.quotas.length === 0) {
    return `
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-600 dark:text-gray-400">Kota bilgisi yüklenmedi</p>
      </div>
    `;
  }

  const limitedQuotas = data.quotas.filter((quota) => quota.limit !== null);

  if (compact && limitedQuotas.length === 0) {
    return '';
  }

  if (compact) {
    return `<div class="space-y-3">${limitedQuotas.map(renderCompactQuota).join('')}</div>`;
  }

  return `
    <div>
      <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Kullanım Kotaları</h3>
      <div class="space-y-4">${data.quotas.map(renderFullQuota).join('')}</div>
      ${
        data.tier && limitedQuotas.length > 0
          ? `
            <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p class="text-sm text-blue-900 dark:text-blue-300">
                <span class="font-semibold">Mevcut plan:</span> ${data.tier.name}
              </p>
              <p class="mt-2 text-sm text-blue-800 dark:text-blue-400">
                Premium plana yükseltin ve tüm kotalı özelliklere sınırsız erişim elde edin.
              </p>
            </div>
          `
          : ''
      }
    </div>
  `;
}

function renderQuotaError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <p class="text-sm text-red-700 dark:text-red-300">${message}</p>
    </div>
  `;
}

async function loadQuotaDisplay(root: QuotaRoot) {
  const content = root.querySelector<HTMLElement>('[data-quota-content]');
  const loading = root.querySelector<HTMLElement>('[data-quota-loading]');
  if (!content || !loading) return;

  try {
    const response = await fetch('/api/user/quotas');
    if (!response.ok) {
      throw new Error('Kota bilgileri alınamadı');
    }

    const data = (await response.json()) as QuotaResponse;
    setElementHtml(content, renderQuotaContent(data, root.dataset.compact === 'true'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kota bilgileri yüklenemedi';
    setElementHtml(content, renderQuotaError(message));
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initQuotaUsageDisplays() {
  const roots = Array.from(
    document.querySelectorAll<QuotaRoot>('[data-quota-usage-display]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void loadQuotaDisplay(root);
  }
}
