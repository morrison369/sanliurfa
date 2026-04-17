export interface BillingRecord {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  billingCycle: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  status: string;
  paidAt?: string;
  nextBillingDate?: string;
  createdAt: string;
}

export function extractBillingHistory(payload: unknown): BillingRecord[] {
  const directData =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data?: unknown }).data
      : undefined;

  const resolved =
    directData && typeof directData === 'object'
      ? directData
      : payload && typeof payload === 'object'
        ? payload
        : {};

  const billing = (resolved as { billing?: unknown }).billing;
  return Array.isArray(billing) ? (billing as BillingRecord[]) : [];
}

function formatBillingDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function renderBillingStatus(status: string): string {
  const className =
    status === 'paid'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : status === 'pending'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  const label =
    status === 'paid' ? 'Ödendi' : status === 'pending' ? 'Beklemede' : 'Başarısız';

  return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}">${label}</span>`;
}

function renderBillingRow(record: BillingRecord): string {
  return `
    <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${formatBillingDate(record.createdAt)}</td>
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">₺${record.amount.toFixed(2)}</td>
      <td class="px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-400">${
        record.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'
      }</td>
      <td class="px-4 py-3">${renderBillingStatus(record.status)}</td>
    </tr>
  `;
}

export function renderBillingHistory(records: BillingRecord[]): string {
  if (records.length === 0) {
    return `
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p class="text-gray-600 dark:text-gray-400">Henüz ödeme kaydı yok</p>
      </div>
    `;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Tarih</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Tutar</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Dönem</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Durum</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(renderBillingRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderBillingHistoryError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <p class="mb-1 font-medium text-red-800 dark:text-red-200">Ödeme geçmişi yüklenemedi</p>
      <p class="text-red-700 dark:text-red-300">${message}</p>
    </div>
  `;
}
