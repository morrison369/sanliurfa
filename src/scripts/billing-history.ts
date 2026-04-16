import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractBillingHistory,
  renderBillingHistory,
  renderBillingHistoryError,
} from '../lib/billing-history';

type BillingHistoryRoot = HTMLElement & { dataset: DOMStringMap };

async function renderBillingHistoryRoot(root: BillingHistoryRoot) {
  const loading = root.querySelector<HTMLElement>('[data-billing-loading]');
  const content = root.querySelector<HTMLElement>('[data-billing-content]');
  if (!loading || !content) return;

  try {
    const response = await fetch('/api/user/subscription/billing');
    if (!response.ok) {
      throw new Error('Ödeme geçmişi yüklenemedi');
    }

    const records = extractBillingHistory(await response.json());
    setElementHtml(content, renderBillingHistory(records));
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
    void renderBillingHistoryRoot(root);
  }
}
