import {
  extractBillingHistory,
  renderBillingHistory,
  renderBillingHistoryError,
} from '../lib/billing-history';
import {
  exportCsvView,
  readJsonArray,
  readStoredDatasetValue,
  writeJsonArray,
  writeStoredDatasetValue,
} from './shared/history-view';
import { getRootPanels, renderRootContent } from './shared/root-render';

type BillingHistoryRoot = HTMLElement & { dataset: DOMStringMap };
const BILLING_STATUS_STORAGE_KEY = 'sanliurfa:billing-history:selected-status';

function getFilteredRecords(root: BillingHistoryRoot) {
  const selectedStatus = readSelectedStatus(root);
  const records = readRecords(root);
  return selectedStatus
    ? records.filter((record: any) => record.status === selectedStatus)
    : records;
}

function readSelectedStatus(root: BillingHistoryRoot): string {
  return readStoredDatasetValue(root, 'selectedStatus', BILLING_STATUS_STORAGE_KEY);
}

function writeSelectedStatus(root: BillingHistoryRoot, value: string) {
  writeStoredDatasetValue(root, 'selectedStatus', BILLING_STATUS_STORAGE_KEY, value);
}

function readRecords(root: BillingHistoryRoot) {
  return readJsonArray(root, 'billingJson');
}

function writeRecords(root: BillingHistoryRoot, records: unknown[]) {
  writeJsonArray(root, 'billingJson', records);
}

function exportBillingView(root: BillingHistoryRoot) {
  const selectedStatus = readSelectedStatus(root);
  const records = getFilteredRecords(root);
  if (records.length === 0) return;

  const header = ['Tarih', 'Tutar', 'Para Birimi', 'Dönem', 'Fatura', 'Ödeme Yöntemi', 'Durum'];
  const rows = records.map((record: any) => [
    record.createdAt || '',
    String(record.amount ?? ''),
    record.currency || '',
    record.billingCycle || '',
    record.invoiceNumber || '',
    record.paymentMethod || '',
    record.status || '',
  ]);
  exportCsvView(
    selectedStatus ? `odeme-gecmisi-${selectedStatus}.csv` : 'odeme-gecmisi.csv',
    header,
    rows,
  );
}

async function renderBillingHistoryRoot(root: BillingHistoryRoot) {
  const { loading, content } = getRootPanels(root, '[data-billing-loading]', '[data-billing-content]');
  if (!loading || !content) return;

  try {
    const selectedStatus = readSelectedStatus(root);
    let records = readRecords(root);

    if (records.length === 0) {
      const response = await fetch('/api/user/subscription/billing');
      if (!response.ok) {
        throw new Error('Ödeme geçmişi alınamadı');
      }

      records = extractBillingHistory(await response.json());
      writeRecords(root, records);
    }

    renderRootContent({
      root,
      contentSelector: '[data-billing-content]',
      loadingSelector: '[data-billing-loading]',
      html: renderBillingHistory({
        records,
        selectedStatus,
      }),
      bind: (nextContent) => {
        nextContent.querySelectorAll<HTMLElement>('[data-billing-status]').forEach((button) => {
          button.addEventListener('click', () => {
            writeSelectedStatus(root, button.dataset.billingStatus || '');
            void renderBillingHistoryRoot(root);
          });
        });

        nextContent.querySelectorAll<HTMLElement>('[data-billing-export]').forEach((button) => {
          button.addEventListener('click', () => {
            exportBillingView(root);
          });
        });
      },
    });
  } catch (error) {
    renderRootContent({
      root,
      contentSelector: '[data-billing-content]',
      loadingSelector: '[data-billing-loading]',
      html: renderBillingHistoryError(
        error instanceof Error ? error.message : 'Ödeme geçmişi yüklenemedi',
      ),
    });
  }
}

export function initBillingHistory() {
  const roots = Array.from(document.querySelectorAll<BillingHistoryRoot>('[data-billing-history]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.selectedStatus = readSelectedStatus(root);
    void renderBillingHistoryRoot(root);
  }
}
