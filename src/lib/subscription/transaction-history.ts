export interface LoyaltyTransaction {
  id: string;
  transaction_type: string;
  points_amount: number;
  transaction_reason: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  expires_at?: string;
  is_expired: boolean;
}

export interface LoyaltyTransactionPagination {
  limit: number;
  offset: number;
  total: number;
}

export interface TransactionHistoryPayload {
  transactions: LoyaltyTransaction[];
  pagination: LoyaltyTransactionPagination;
  selectedType: string;
}

const DEFAULT_PAGINATION: LoyaltyTransactionPagination = {
  limit: 20,
  offset: 0,
  total: 0,
};

function getTransactionIcon(type: string): string {
  switch (type) {
    case 'earn':
      return '✅';
    case 'spend':
    case 'redeem':
      return '💰';
    case 'expire':
      return '⏰';
    case 'birthday_bonus':
      return '🎂';
    case 'annual_reset':
      return '🔄';
    default:
      return '•';
  }
}

function getTransactionColorClass(type: string): string {
  if (type.includes('earn') || type.includes('bonus') || type.includes('reset')) {
    return 'text-green-600';
  }

  if (type.includes('spend') || type.includes('redeem')) {
    return 'text-orange-600';
  }

  return 'text-gray-600';
}

function getTransactionTypes(transactions: LoyaltyTransaction[]): string[] {
  return Array.from(
    new Set(transactions.map((transaction) => transaction.transaction_type)),
  ).sort();
}

function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case 'earn':
      return 'Puan kazanımı';
    case 'spend':
      return 'Puan harcaması';
    case 'redeem':
      return 'Ödül kullanımı';
    case 'expire':
      return 'Süresi dolan puanlar';
    case 'birthday_bonus':
      return 'Doğum günü bonusu';
    case 'annual_reset':
      return 'Yıllık sıfırlama';
    default:
      return type.replace(/_/g, ' ');
  }
}

function renderTransactionTypeFilters(
  types: string[],
  selectedType: string,
): string {
  if (types.length === 0) return '';

  const renderButton = (type: string, label: string) => {
    const active = selectedType === type;
    return `
      <button
        type="button"
        data-transaction-type="${type}"
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
    <div class="mb-4 flex flex-wrap gap-2">
      ${renderButton('', 'Tüm işlemler')}
      ${types
        .map((type) => renderButton(type, getTransactionTypeLabel(type)))
        .join('')}
    </div>
  `;
}

function renderTransactionCard(transaction: LoyaltyTransaction): string {
  const createdAt = new Date(transaction.created_at);
  const createdAtLabel = `${createdAt.toLocaleDateString('tr-TR')} ${createdAt.toLocaleTimeString('tr-TR')}`;
  const expiresAtLabel = transaction.expires_at
    ? new Date(transaction.expires_at).toLocaleDateString('tr-TR')
    : '';

  return `
    <div class="rounded-lg border bg-white p-4 ${transaction.is_expired ? 'opacity-60' : ''}">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${getTransactionIcon(transaction.transaction_type)}</span>
          <div>
            <p class="font-semibold capitalize">${transaction.transaction_reason}</p>
            <p class="text-xs text-gray-500">${createdAtLabel}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold ${getTransactionColorClass(transaction.transaction_type)}">
            ${transaction.points_amount > 0 ? '+' : '-'}${Math.abs(
              transaction.points_amount,
            )}
          </p>
          <p class="text-xs text-gray-500">${transaction.balance_before} → ${transaction.balance_after}</p>
        </div>
      </div>

      ${
        transaction.is_expired
          ? '<p class="text-xs font-medium text-red-600">Süresi dolmuş</p>'
          : transaction.expires_at
            ? `<p class="text-xs text-orange-600">Sonu: ${expiresAtLabel}</p>`
            : ''
      }
    </div>
  `;
}

function renderPagination(pagination: LoyaltyTransactionPagination): string {
  const pageCount = Math.ceil(pagination.total / pagination.limit);
  if (pageCount <= 1) return '';

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const previousDisabled = pagination.offset === 0;
  const nextDisabled = currentPage === pageCount;

  return `
    <div class="flex items-center justify-between">
      <button
        type="button"
        data-transaction-page="prev"
        ${previousDisabled ? 'disabled' : ''}
        class="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Önceki
      </button>

      <span class="text-sm text-gray-600">
        Sayfa ${currentPage} / ${pageCount} (${pagination.total} toplam)
      </span>

      <button
        type="button"
        data-transaction-page="next"
        ${nextDisabled ? 'disabled' : ''}
        class="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sonraki
      </button>
    </div>
  `;
}

export function extractTransactionHistoryData(payload: unknown): {
  transactions: LoyaltyTransaction[];
  pagination: LoyaltyTransactionPagination;
} {
  const nestedData =
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    payload.data &&
    typeof payload.data === 'object' &&
    'data' in payload.data
      ? (payload.data as { data?: unknown }).data
      : undefined;

  const directData =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data?: unknown }).data
      : undefined;

  const resolved =
    nestedData && typeof nestedData === 'object'
      ? nestedData
      : directData && typeof directData === 'object'
        ? directData
        : payload && typeof payload === 'object'
          ? payload
          : {};

  const transactions = Array.isArray(
    (resolved as { transactions?: unknown }).transactions,
  )
    ? ((resolved as { transactions: LoyaltyTransaction[] }).transactions ?? [])
    : [];

  const paginationCandidate = (resolved as {
    pagination?: LoyaltyTransactionPagination;
  }).pagination;
  const pagination =
    paginationCandidate &&
    typeof paginationCandidate.limit === 'number' &&
    typeof paginationCandidate.offset === 'number' &&
    typeof paginationCandidate.total === 'number'
      ? paginationCandidate
      : DEFAULT_PAGINATION;

  return { transactions, pagination };
}

export function renderTransactionHistory(
  payload: TransactionHistoryPayload,
): string {
  const types = getTransactionTypes(payload.transactions);
  const positiveTransactions = payload.transactions.filter((transaction) => transaction.points_amount > 0);
  const negativeTransactions = payload.transactions.filter((transaction) => transaction.points_amount < 0);
  const currentPage = Math.floor(payload.pagination.offset / payload.pagination.limit) + 1;
  const pageCount = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));

  if (payload.transactions.length === 0) {
    return `
      ${renderTransactionTypeFilters(types, payload.selectedType)}
      <div class="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        <p class="text-lg font-medium text-gray-900 dark:text-white">Henüz görüntülenecek işlem geçmişi bulunmuyor.</p>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Puan kazandığınız veya harcadığınız işlemler burada listelenecek.</p>
        <div class="mt-4 flex flex-wrap justify-center gap-3 text-sm">
          <a href="/profil/favoriler" class="text-blue-700 transition-colors hover:text-blue-800">Favori mekanlara göz at</a>
          <a href="/oneriler" class="text-blue-700 transition-colors hover:text-blue-800">Yeni öneriler keşfet</a>
        </div>
      </div>
    `;
  }

  return `
    ${renderTransactionTypeFilters(types, payload.selectedType)}
    <div class="mb-4 grid gap-3 md:grid-cols-3">
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p class="text-sm text-gray-600 dark:text-gray-400">Bu görünümde kayıt</p>
        <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">${payload.transactions.length}</p>
      </div>
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p class="text-sm text-gray-600 dark:text-gray-400">Puan kazanımı</p>
        <p class="mt-1 text-lg font-semibold text-green-700 dark:text-green-400">${positiveTransactions.length}</p>
      </div>
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p class="text-sm text-gray-600 dark:text-gray-400">Puan kullanımı</p>
        <p class="mt-1 text-lg font-semibold text-orange-700 dark:text-orange-400">${negativeTransactions.length}</p>
      </div>
    </div>
    <div class="space-y-3">
      ${payload.transactions.map(renderTransactionCard).join('')}
    </div>
    <div class="mt-4 text-sm text-gray-500">
      Sayfa görünümü: ${currentPage} / ${pageCount}
    </div>
    ${renderPagination(payload.pagination)}
  `;
}

export function renderTransactionHistoryError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="font-medium text-red-800">İşlem geçmişi görüntülenemedi.</p>
      <p class="mt-1 text-red-800">${message}</p>
      <div class="mt-3 flex flex-wrap gap-3 text-sm">
        <a href="/profil" class="text-red-800 underline decoration-red-300 underline-offset-2">Profil özetine dön</a>
        <a href="/iletisim" class="text-red-800 underline decoration-red-300 underline-offset-2">Destek alın</a>
      </div>
    </div>
  `;
}
