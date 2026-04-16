import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractLoyaltyDashboardData,
  extractLoyaltyMessage,
  renderLoyaltyDashboard,
  type LoyaltyDashboardData,
  type LoyaltyDashboardTab,
} from '../lib/loyalty-dashboard';

type LoyaltyRoot = HTMLElement & { dataset: DOMStringMap };

function readData(root: LoyaltyRoot): LoyaltyDashboardData | null {
  const raw = root.dataset.loyaltyData;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoyaltyDashboardData;
  } catch {
    return null;
  }
}

function writeData(root: LoyaltyRoot, data: LoyaltyDashboardData | null) {
  if (!data) {
    delete root.dataset.loyaltyData;
    return;
  }

  root.dataset.loyaltyData = JSON.stringify(data);
}

function readActiveTab(root: LoyaltyRoot): LoyaltyDashboardTab {
  const raw = root.dataset.activeTab;
  return raw === 'rewards' || raw === 'achievements' ? raw : 'overview';
}

function setError(root: LoyaltyRoot, message: string | null) {
  if (message) {
    root.dataset.error = message;
  } else {
    delete root.dataset.error;
  }
}

async function fetchLoyaltyData(root: LoyaltyRoot) {
  const response = await fetch('/api/user/loyalty?section=all');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractLoyaltyMessage(payload, 'Sadakat bilgileri alınamadı'));
  }

  const data = extractLoyaltyDashboardData(payload);
  if (!data) {
    throw new Error('Sadakat bilgileri alınamadı');
  }

  writeData(root, data);
  setError(root, null);
}

function bindTabs(root: LoyaltyRoot, content: HTMLElement) {
  const buttons = Array.from(content.querySelectorAll<HTMLElement>('[data-loyalty-tab]'));

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const tab = button.dataset.loyaltyTab;
      if (tab !== 'overview' && tab !== 'rewards' && tab !== 'achievements') return;
      root.dataset.activeTab = tab;
      renderRoot(root);
    });
  }
}

async function renderRoot(root: LoyaltyRoot) {
  const loading = root.querySelector<HTMLElement>('[data-loyalty-loading]');
  const content = root.querySelector<HTMLElement>('[data-loyalty-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.loyaltyData && !root.dataset.error) {
      await fetchLoyaltyData(root);
    }

    setElementHtml(
      content,
      renderLoyaltyDashboard({
        data: readData(root),
        error: root.dataset.error || null,
        activeTab: readActiveTab(root),
      }),
    );
    bindTabs(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Sadakat bilgileri alınamadı');
    setElementHtml(
      content,
      renderLoyaltyDashboard({
        data: null,
        error: root.dataset.error || null,
        activeTab: 'overview',
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initLoyaltyDashboard() {
  const roots = Array.from(document.querySelectorAll<LoyaltyRoot>('[data-loyalty-dashboard]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.activeTab) root.dataset.activeTab = 'overview';
    void renderRoot(root);
  }
}
