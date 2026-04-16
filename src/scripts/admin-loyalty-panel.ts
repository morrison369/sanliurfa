import { fetchAdminLoyaltyRewards } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractAdminLoyaltyRewards,
  renderAdminLoyaltyPanel,
  type AdminLoyaltyReward,
} from '../lib/admin-loyalty-panel';

type AdminLoyaltyRoot = HTMLElement & { dataset: DOMStringMap };

function readRewards(root: AdminLoyaltyRoot): AdminLoyaltyReward[] {
  const raw = root.dataset.rewards;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AdminLoyaltyReward[];
  } catch {
    return [];
  }
}

function writeRewards(root: AdminLoyaltyRoot, rewards: AdminLoyaltyReward[]) {
  root.dataset.rewards = JSON.stringify(rewards);
}

function setError(root: AdminLoyaltyRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchRewards(root: AdminLoyaltyRoot) {
  const payload = await fetchAdminLoyaltyRewards();
  writeRewards(root, extractAdminLoyaltyRewards(payload));
  setError(root, null);
}

async function renderRoot(root: AdminLoyaltyRoot) {
  const loading = root.querySelector<HTMLElement>('[data-admin-loyalty-loading]');
  const content = root.querySelector<HTMLElement>('[data-admin-loyalty-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.rewards && !root.dataset.error) {
      await fetchRewards(root);
    }

    setElementHtml(
      content,
      renderAdminLoyaltyPanel({
        activeTab: 'rewards',
        rewards: readRewards(root),
        error: root.dataset.error || null,
      }),
    );
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Ödüller alınamadı');
    setElementHtml(
      content,
      renderAdminLoyaltyPanel({
        activeTab: 'rewards',
        rewards: [],
        error: root.dataset.error || 'Ödüller alınamadı',
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initAdminLoyaltyPanel() {
  const roots = Array.from(document.querySelectorAll<AdminLoyaltyRoot>('[data-admin-loyalty-panel]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRoot(root);
  }
}
