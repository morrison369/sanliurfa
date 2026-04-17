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

    setElementHtml(
      content,
      renderTransactionHistory({
        transactions,
        pagination,
        selectedType: root.dataset.selectedType || '',
      }),
    );

    content.querySelectorAll<HTMLElement>('[data-transaction-type]').forEach((button) => {
      button.addEventListener('click', () => {
        writeSelectedType(root, button.dataset.transactionType || '');
        root.dataset.offset = '0';
        void renderTransactionHistoryRoot(root);
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
    void renderTransactionHistoryRoot(root);
  }
}
