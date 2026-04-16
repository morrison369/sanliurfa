import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractRewardRedemption,
  extractRewardsCatalog,
  extractRewardsErrorMessage,
  renderRewardsCatalog,
  renderRewardsCatalogError,
  type RewardsCatalogState,
} from '../lib/rewards-catalog-ui';

type RewardsCatalogRoot = HTMLElement & { dataset: DOMStringMap };

function getCatalogState(root: RewardsCatalogRoot): RewardsCatalogState {
  return {
    rewards: [],
    promos: [],
    selectedCategory: root.dataset.selectedCategory || 'all',
    redeemingRewardId: root.dataset.redeemingRewardId || null,
    message:
      root.dataset.messageType && root.dataset.messageText
        ? {
            type: root.dataset.messageType as 'success' | 'error',
            text: root.dataset.messageText,
          }
        : null,
  };
}

function setCatalogMessage(root: RewardsCatalogRoot, type: 'success' | 'error', text: string) {
  root.dataset.messageType = type;
  root.dataset.messageText = text;
}

function clearCatalogMessage(root: RewardsCatalogRoot) {
  delete root.dataset.messageType;
  delete root.dataset.messageText;
}

async function fetchRewardsPayload(root: RewardsCatalogRoot) {
  const params = new URLSearchParams({ includePromos: 'true' });
  if (root.dataset.selectedCategory && root.dataset.selectedCategory !== 'all') {
    params.set('category', root.dataset.selectedCategory);
  }

  const response = await fetch(`/api/loyalty/rewards?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Ödüller yüklenemedi');
  }

  return extractRewardsCatalog(await response.json());
}

async function redeemReward(root: RewardsCatalogRoot, rewardId: string) {
  root.dataset.redeemingRewardId = rewardId;
  await renderRewardsCatalogRoot(root);

  try {
    const response = await fetch('/api/loyalty/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractRewardsErrorMessage(payload, 'Ödül alınamadı'));
    }

    const redemption = extractRewardRedemption(payload);
    setCatalogMessage(
      root,
      'success',
      `${redemption.message}! Kod: ${redemption.redemptionCode ?? 'hazırlanıyor'}`,
    );
  } catch (error) {
    setCatalogMessage(
      root,
      'error',
      error instanceof Error ? error.message : 'Ödül alınamadı',
    );
  } finally {
    delete root.dataset.redeemingRewardId;
    await renderRewardsCatalogRoot(root);
  }
}

function bindCatalogActions(root: RewardsCatalogRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-reward-category]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.rewardCategory || 'all';
      if (root.dataset.selectedCategory === category) return;
      root.dataset.selectedCategory = category;
      void renderRewardsCatalogRoot(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-reward-redeem]').forEach((button) => {
    button.addEventListener('click', () => {
      const rewardId = button.dataset.rewardRedeem;
      if (!rewardId || root.dataset.redeemingRewardId) return;
      void redeemReward(root, rewardId);
    });
  });
}

async function renderRewardsCatalogRoot(root: RewardsCatalogRoot) {
  const loading = root.querySelector<HTMLElement>('[data-rewards-loading]');
  const content = root.querySelector<HTMLElement>('[data-rewards-content]');
  if (!loading || !content) return;

  try {
    const { rewards, promos } = await fetchRewardsPayload(root);
    const state = getCatalogState(root);
    state.rewards = rewards;
    state.promos = promos;

    setElementHtml(content, renderRewardsCatalog(state));
    bindCatalogActions(root, content);
  } catch (error) {
    clearCatalogMessage(root);
    setElementHtml(
      content,
      renderRewardsCatalogError(
        error instanceof Error ? error.message : 'Ödüller yüklenemedi',
      ),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initRewardsCatalog() {
  const roots = Array.from(document.querySelectorAll<RewardsCatalogRoot>('[data-rewards-catalog]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.selectedCategory = root.dataset.selectedCategory || 'all';
    void renderRewardsCatalogRoot(root);
  }
}
