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

export interface BillingHistoryPayload {
  records: BillingRecord[];
  selectedStatus: string;
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

function getBillingStatuses(records: BillingRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.status))).sort();
}

function formatBillingDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function getBillingStatusLabel(status: string): string {
  const normalized = status.toLowerCase();

  return normalized === 'paid' ||
    normalized === 'succeeded' ||
    normalized === 'completed'
    ? 'Ödendi'
    : normalized === 'pending' || normalized === 'processing'
      ? 'Beklemede'
      : normalized === 'refunded'
        ? 'İade edildi'
        : normalized === 'canceled' || normalized === 'cancelled'
          ? 'İptal edildi'
          : 'Başarısız';
}

function renderBillingStatus(status: string): string {
  const normalized = status.toLowerCase();
  const label = getBillingStatusLabel(status);

  const className =
    normalized === 'paid' ||
    normalized === 'succeeded' ||
    normalized === 'completed'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : normalized === 'pending' || normalized === 'processing'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : normalized === 'refunded'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          : normalized === 'canceled' || normalized === 'cancelled'
            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}">${label}</span>`;
}

function renderBillingStatusFilters(
  statuses: string[],
  selectedStatus: string,
): string {
  const renderButton = (status: string, label: string) => {
    const active = selectedStatus === status;

    return `
      <button
        type="button"
        data-billing-status="${status}"
        class="rounded-lg px-3 py-1 text-sm font-medium transition ${
          active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }"
      >
        ${label}
      </button>
    `;
  };

  return `
    <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap gap-2">
        ${renderButton('', 'Tüm kayıtlar')}
        ${statuses
          .map((status) => renderButton(status, getBillingStatusLabel(status)))
          .join('')}
      </div>
      <button type="button" data-billing-export class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
        Görünümü dışa aktar
      </button>
    </div>
  `;
}

function renderBillingSupportLinks(): string {
  return `
    <div class="mt-4 flex flex-wrap justify-center gap-3 text-sm">
      <a href="/fiyatlandirma" class="text-blue-700 transition-colors hover:text-blue-800">Planları incele</a>
      <a href="/iletisim" class="text-blue-700 transition-colors hover:text-blue-800">Destek alın</a>
    </div>
  `;
}

function renderBillingRow(record: BillingRecord): string {
  const invoice = record.invoiceNumber?.trim() || 'Fatura bekleniyor';
  const paymentMethod = record.paymentMethod?.trim() || 'Yöntem bilgisi yok';

  return `
    <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${formatBillingDate(record.createdAt)}</td>
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">₺${record.amount.toFixed(2)}</td>
      <td class="px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-400">${
        record.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'
      }</td>
      <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${invoice}</td>
      <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${paymentMethod}</td>
      <td class="px-4 py-3">${renderBillingStatus(record.status)}</td>
    </tr>
  `;
}

export function renderBillingHistory(payload: BillingHistoryPayload): string {
  const statuses = getBillingStatuses(payload.records);
  const filteredRecords = payload.selectedStatus
    ? payload.records.filter((record) => record.status === payload.selectedStatus)
    : payload.records;
  const paidRecords = payload.records.filter((record) => {
    const normalized = record.status.toLowerCase();
    return normalized === 'paid' || normalized === 'succeeded' || normalized === 'completed';
  });
  const totalPaid = paidRecords.reduce((sum, record) => sum + record.amount, 0);
  const latestRecord = [...payload.records].sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];

  if (payload.records.length === 0) {
    return `
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p class="text-lg font-medium text-gray-900 dark:text-white">Henüz ödeme geçmişi kaydı bulunmuyor.</p>
        <p class="mt-2 text-gray-600 dark:text-gray-400">İlk ödemeniz tamamlandığında fatura ve dönem kayıtlarınız burada listelenecek.</p>
        ${renderBillingSupportLinks()}
      </div>
    `;
  }

  if (filteredRecords.length === 0) {
    return `
      ${renderBillingStatusFilters(statuses, payload.selectedStatus)}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p class="text-lg font-medium text-gray-900 dark:text-white">Bu durum için ödeme kaydı bulunmuyor.</p>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Başka bir durum filtresi seçebilir veya tüm ödeme kayıtlarını görüntüleyebilirsiniz.</p>
      </div>
    `;
  }

  return `
    ${renderBillingStatusFilters(statuses, payload.selectedStatus)}
    <div class="mb-4 grid gap-3 md:grid-cols-2">
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p class="text-sm text-gray-600 dark:text-gray-400">Toplam başarılı ödeme</p>
        <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">₺${totalPaid.toFixed(2)}</p>
      </div>
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p class="text-sm text-gray-600 dark:text-gray-400">Son ödeme kaydı</p>
        <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">${
          latestRecord ? formatBillingDate(latestRecord.createdAt) : '-'
        }</p>
      </div>
    </div>
    <div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <p class="text-sm text-gray-600 dark:text-gray-400">Görünüm özeti</p>
      <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">
        ${payload.selectedStatus ? `${getBillingStatusLabel(payload.selectedStatus)} kayıtları` : 'Tüm ödeme kayıtları'}
      </p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Fatura numarası ve ödeme yöntemi ayrıntıları bu görünümde listelenir.
      </p>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Tarih</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Tutar</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Dönem</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Fatura</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Ödeme yöntemi</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Durum</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRecords.map(renderBillingRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderBillingHistoryError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <p class="mb-1 font-medium text-red-800 dark:text-red-200">Ödeme geçmişi görüntülenemedi.</p>
      <p class="text-red-700 dark:text-red-300">${message}</p>
      <div class="mt-3 flex flex-wrap gap-3 text-sm">
        <a href="/iletisim" class="text-red-800 underline decoration-red-300 underline-offset-2 dark:text-red-200">Destek ekibiyle iletişime geçin</a>
        <a href="/fiyatlandirma" class="text-red-800 underline decoration-red-300 underline-offset-2 dark:text-red-200">Plan ayrıntılarını kontrol edin</a>
      </div>
    </div>
  `;
}
