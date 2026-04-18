import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractTransactionHistoryData,
  renderTransactionHistory,
  renderTransactionHistoryError,
  type LoyaltyTransactionPagination,
} from '../lib/transaction-history';

type TransactionHistoryRoot = HTMLElement & {
  dataset: DOMStringMap;
};
const TRANSACTION_TYPE_STORAGE_KEY = 'sanliurfa:transaction-history:selected-type';
const TRANSACTION_DATE_FROM_STORAGE_KEY = 'sanliurfa:transaction-history:date-from';
const TRANSACTION_DATE_TO_STORAGE_KEY = 'sanliurfa:transaction-history:date-to';

function readSelectedType(root: TransactionHistoryRoot): string {
  if (root.dataset.selectedType) return root.dataset.selectedType;

  try {
    return window.localStorage.getItem(TRANSACTION_TYPE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeSelectedType(root: TransactionHistoryRoot, value: string) {
  root.dataset.selectedType = value;

  try {
    if (value) {
      window.localStorage.setItem(TRANSACTION_TYPE_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(TRANSACTION_TYPE_STORAGE_KEY);
    }
  } catch {
    // no-op
  }
}

function readStoredValue(root: TransactionHistoryRoot, datasetKey: 'dateFrom' | 'dateTo', storageKey: string): string {
  if (root.dataset[datasetKey]) return root.dataset[datasetKey] || '';

  try {
    return window.localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

function writeStoredValue(root: TransactionHistoryRoot, datasetKey: 'dateFrom' | 'dateTo', storageKey: string, value: string) {
  root.dataset[datasetKey] = value;

  try {
    if (value) {
      window.localStorage.setItem(storageKey, value);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // no-op
  }
}

function getPaginationState(root: TransactionHistoryRoot): LoyaltyTransactionPagination {
  return {
    limit: Number.parseInt(root.dataset.limit || '20', 10),
    offset: Number.parseInt(root.dataset.offset || '0', 10),
    total: Number.parseInt(root.dataset.total || '0', 10),
  };
}

function setPaginationState(root: TransactionHistoryRoot, pagination: LoyaltyTransactionPagination) {
  root.dataset.limit = String(pagination.limit);
  root.dataset.offset = String(pagination.offset);
  root.dataset.total = String(pagination.total);
}

function readTransactions(root: TransactionHistoryRoot) {
  const raw = root.dataset.transactionsJson;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTransactions(root: TransactionHistoryRoot, transactions: unknown[]) {
  root.dataset.transactionsJson = JSON.stringify(transactions);
}

function getVisibleTransactions(root: TransactionHistoryRoot) {
  const transactions = readTransactions(root);
  const dateFrom = root.dataset.dateFrom || '';
  const dateTo = root.dataset.dateTo || '';
  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return transactions.filter((transaction: any) => {
    const createdAt = new Date(transaction.created_at).getTime();
    return createdAt >= fromTime && createdAt <= toTime;
  });
}

function exportTransactionView(root: TransactionHistoryRoot) {
  const transactions = getVisibleTransactions(root);
  if (transactions.length === 0) return;

  const header = ['Tarih', 'İşlem Tipi', 'Puan', 'Neden', 'Önceki Bakiye', 'Sonraki Bakiye'];
  const rows = transactions.map((transaction: any) => [
    transaction.created_at || '',
    transaction.transaction_type || '',
    String(transaction.points_amount ?? ''),
    transaction.transaction_reason || '',
    String(transaction.balance_before ?? ''),
    String(transaction.balance_after ?? ''),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'islem-gecmisi.csv';
  link.click();
  window.URL.revokeObjectURL(url);
}

async function fetchTransactions(root: TransactionHistoryRoot) {
  const pagination = getPaginationState(root);
  const params = new URLSearchParams({
    limit: String(pagination.limit),
    offset: String(pagination.offset),
  });

  if (root.dataset.selectedType) {
    params.append('type', root.dataset.selectedType);
  }

  const response = await fetch(`/api/loyalty/transactions?${params.toString()}`);
  if (!response.ok) {
    throw new Error('İşlem geçmişi yüklenemedi');
  }

  return extractTransactionHistoryData(await response.json());
}

async function renderTransactionHistoryRoot(root: TransactionHistoryRoot) {
  const loading = root.querySelector<HTMLElement>('[data-transaction-loading]');
  const content = root.querySelector<HTMLElement>('[data-transaction-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'space-y-3');
  setElementClassName(content, 'hidden');

  try {
    const { transactions, pagination } = await fetchTransactions(root);
    setPaginationState(root, pagination);
    writeTransactions(root, transactions);

    setElementHtml(
      content,
      renderTransactionHistory({
        transactions,
        pagination,
        selectedType: root.dataset.selectedType || '',
        dateFrom: root.dataset.dateFrom || '',
        dateTo: root.dataset.dateTo || '',
      }),
    );

    content.querySelectorAll<HTMLElement>('[data-transaction-type]').forEach((button) => {
      button.addEventListener('click', () => {
        writeSelectedType(root, button.dataset.transactionType || '');
        root.dataset.offset = '0';
        void renderTransactionHistoryRoot(root);
      });
    });

    content.querySelectorAll<HTMLInputElement>('[data-transaction-date-from]').forEach((input) => {
      input.addEventListener('change', () => {
        writeStoredValue(root, 'dateFrom', TRANSACTION_DATE_FROM_STORAGE_KEY, input.value || '');
        void renderTransactionHistoryRoot(root);
      });
    });

    content.querySelectorAll<HTMLInputElement>('[data-transaction-date-to]').forEach((input) => {
      input.addEventListener('change', () => {
        writeStoredValue(root, 'dateTo', TRANSACTION_DATE_TO_STORAGE_KEY, input.value || '');
        void renderTransactionHistoryRoot(root);
      });
    });

    content.querySelectorAll<HTMLElement>('[data-transaction-export]').forEach((button) => {
      button.addEventListener('click', () => {
        exportTransactionView(root);
      });
    });

    content.querySelectorAll<HTMLElement>('[data-transaction-page]').forEach((button) => {
      button.addEventListener('click', () => {
        const state = getPaginationState(root);
        if (button.dataset.transactionPage === 'prev') {
          root.dataset.offset = String(Math.max(0, state.offset - state.limit));
        } else {
          const maxOffset = Math.max(0, (Math.ceil(state.total / state.limit) - 1) * state.limit);
          root.dataset.offset = String(Math.min(maxOffset, state.offset + state.limit));
        }

        void renderTransactionHistoryRoot(root);
      });
    });
  } catch (error) {
    setElementHtml(
      content,
      renderTransactionHistoryError(
        error instanceof Error ? error.message : 'İşlem geçmişi yüklenemedi',
      ),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initTransactionHistory() {
  const roots = Array.from(
    document.querySelectorAll<TransactionHistoryRoot>('[data-transaction-history]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.total = root.dataset.total || '0';
    root.dataset.selectedType = readSelectedType(root);
    root.dataset.dateFrom = readStoredValue(root, 'dateFrom', TRANSACTION_DATE_FROM_STORAGE_KEY);
    root.dataset.dateTo = readStoredValue(root, 'dateTo', TRANSACTION_DATE_TO_STORAGE_KEY);
    void renderTransactionHistoryRoot(root);
  }
}
