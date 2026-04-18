import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractBillingHistory,
  renderBillingHistory,
  renderBillingHistoryError,
} from '../lib/billing-history';

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
  if (root.dataset.selectedStatus) return root.dataset.selectedStatus;

  try {
    return window.localStorage.getItem(BILLING_STATUS_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeSelectedStatus(root: BillingHistoryRoot, value: string) {
  root.dataset.selectedStatus = value;

  try {
    if (value) {
      window.localStorage.setItem(BILLING_STATUS_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(BILLING_STATUS_STORAGE_KEY);
    }
  } catch {
    // no-op
  }
}

function readRecords(root: BillingHistoryRoot) {
  const raw = root.dataset.billingJson;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(root: BillingHistoryRoot, records: unknown[]) {
  root.dataset.billingJson = JSON.stringify(records);
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
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = selectedStatus
    ? `odeme-gecmisi-${selectedStatus}.csv`
    : 'odeme-gecmisi.csv';
  link.click();
  window.URL.revokeObjectURL(url);
}

async function renderBillingHistoryRoot(root: BillingHistoryRoot) {
  const loading = root.querySelector<HTMLElement>('[data-billing-loading]');
  const content = root.querySelector<HTMLElement>('[data-billing-content]');
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

    setElementHtml(
      content,
      renderBillingHistory({
        records,
        selectedStatus,
      }),
    );

    content.querySelectorAll<HTMLElement>('[data-billing-status]').forEach((button) => {
      button.addEventListener('click', () => {
        writeSelectedStatus(root, button.dataset.billingStatus || '');
        void renderBillingHistoryRoot(root);
      });
    });

    content.querySelectorAll<HTMLElement>('[data-billing-export]').forEach((button) => {
      button.addEventListener('click', () => {
        exportBillingView(root);
      });
    });
  } catch (error) {
    setElementHtml(
      content,
      renderBillingHistoryError(
        error instanceof Error ? error.message : 'Ödeme geçmişi yüklenemedi',
      ),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
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
