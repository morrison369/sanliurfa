import {
  extractTransactionHistoryData,
  renderTransactionHistory,
  renderTransactionHistoryError,
  type LoyaltyTransactionPagination,
} from '../lib/transaction-history';
import {
  exportCsvView,
  readJsonArray,
  readStoredDatasetValue,
  writeJsonArray,
  writeStoredDatasetValue,
} from './shared/history-view';
import { getRootPanels, renderRootContent } from './shared/root-render';

type TransactionHistoryRoot = HTMLElement & {
  dataset: DOMStringMap;
};
const TRANSACTION_TYPE_STORAGE_KEY = 'sanliurfa:transaction-history:selected-type';
const TRANSACTION_DATE_FROM_STORAGE_KEY = 'sanliurfa:transaction-history:date-from';
const TRANSACTION_DATE_TO_STORAGE_KEY = 'sanliurfa:transaction-history:date-to';

function readSelectedType(root: TransactionHistoryRoot): string {
  return readStoredDatasetValue(root, 'selectedType', TRANSACTION_TYPE_STORAGE_KEY);
}

function writeSelectedType(root: TransactionHistoryRoot, value: string) {
  writeStoredDatasetValue(root, 'selectedType', TRANSACTION_TYPE_STORAGE_KEY, value);
}

function readStoredValue(root: TransactionHistoryRoot, datasetKey: 'dateFrom' | 'dateTo', storageKey: string): string {
  return readStoredDatasetValue(root, datasetKey, storageKey);
}

function writeStoredValue(root: TransactionHistoryRoot, datasetKey: 'dateFrom' | 'dateTo', storageKey: string, value: string) {
  writeStoredDatasetValue(root, datasetKey, storageKey, value);
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
  return readJsonArray(root, 'transactionsJson');
}

function writeTransactions(root: TransactionHistoryRoot, transactions: unknown[]) {
  writeJsonArray(root, 'transactionsJson', transactions);
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
  exportCsvView('islem-gecmisi.csv', header, rows);
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
  const { loading, content } = getRootPanels(
    root,
    '[data-transaction-loading]',
    '[data-transaction-content]',
  );
  if (!loading || !content) return;

  loading.className = 'space-y-3';
  content.className = 'hidden';

  try {
    const { transactions, pagination } = await fetchTransactions(root);
    setPaginationState(root, pagination);
    writeTransactions(root, transactions);

    renderRootContent({
      root,
      contentSelector: '[data-transaction-content]',
      loadingSelector: '[data-transaction-loading]',
      html: renderTransactionHistory({
        transactions,
        pagination,
        selectedType: root.dataset.selectedType || '',
        dateFrom: root.dataset.dateFrom || '',
        dateTo: root.dataset.dateTo || '',
      }),
      bind: (nextContent) => {
        nextContent.querySelectorAll<HTMLElement>('[data-transaction-type]').forEach((button) => {
          button.addEventListener('click', () => {
            writeSelectedType(root, button.dataset.transactionType || '');
            root.dataset.offset = '0';
            void renderTransactionHistoryRoot(root);
          });
        });

        nextContent.querySelectorAll<HTMLInputElement>('[data-transaction-date-from]').forEach((input) => {
          input.addEventListener('change', () => {
            writeStoredValue(root, 'dateFrom', TRANSACTION_DATE_FROM_STORAGE_KEY, input.value || '');
            void renderTransactionHistoryRoot(root);
          });
        });

        nextContent.querySelectorAll<HTMLInputElement>('[data-transaction-date-to]').forEach((input) => {
          input.addEventListener('change', () => {
            writeStoredValue(root, 'dateTo', TRANSACTION_DATE_TO_STORAGE_KEY, input.value || '');
            void renderTransactionHistoryRoot(root);
          });
        });

        nextContent.querySelectorAll<HTMLElement>('[data-transaction-export]').forEach((button) => {
          button.addEventListener('click', () => {
            exportTransactionView(root);
          });
        });

        nextContent.querySelectorAll<HTMLElement>('[data-transaction-page]').forEach((button) => {
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
      },
    });
  } catch (error) {
    renderRootContent({
      root,
      contentSelector: '[data-transaction-content]',
      loadingSelector: '[data-transaction-loading]',
      html: renderTransactionHistoryError(
        error instanceof Error ? error.message : 'İşlem geçmişi yüklenemedi',
      ),
    });
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
