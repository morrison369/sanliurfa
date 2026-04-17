import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  renderPricingError,
  renderPricingPlans,
  type SubscriptionTier,
} from '../lib/pricing-plans';

type PricingRoot = HTMLElement & { dataset: DOMStringMap };

async function fetchPricingData() {
  const tiersResponse = await fetch('/api/subscriptions/tiers');
  if (!tiersResponse.ok) throw new Error('Planlar alınamadı');
  const tiersPayload = (await tiersResponse.json()) as {
    data?: { tiers?: SubscriptionTier[] };
    tiers?: SubscriptionTier[];
  };

  let currentTier: string | null = null;
  const subResponse = await fetch('/api/user/subscription');
  if (subResponse.ok) {
    const subPayload = (await subResponse.json()) as {
      data?: { subscription?: { tier?: { id?: string; name?: string } } };
      subscription?: { tier?: { id?: string; name?: string } };
    };
    const subscription = subPayload.data?.subscription ?? subPayload.subscription;
    currentTier = subscription?.tier?.id || null;
  }

  return {
    tiers: tiersPayload.data?.tiers ?? tiersPayload.tiers ?? [],
    currentTier,
  };
}

async function handleCheckout(root: PricingRoot, tierId: string) {
  root.dataset.selectedTier = tierId;
  root.dataset.processing = 'true';
  await renderPricingRoot(root);

  try {
    const response = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierId, billingCycle: 'monthly' }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Ödeme oturumu oluşturulamadı');
    }

    const payload = (await response.json()) as {
      data?: { success?: boolean; checkoutUrl?: string };
      success?: boolean;
      checkoutUrl?: string;
    };
    const data = payload.data ?? payload;
    if (!data.success || !data.checkoutUrl) {
      throw new Error('Ödeme bağlantısı alınamadı');
    }

    window.location.href = data.checkoutUrl;
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Abonelik güncellenemedi');
  } finally {
    root.dataset.selectedTier = '';
    root.dataset.processing = 'false';
    await renderPricingRoot(root);
  }
}

async function renderPricingRoot(root: PricingRoot) {
  const loading = root.querySelector<HTMLElement>('[data-pricing-loading]');
  const content = root.querySelector<HTMLElement>('[data-pricing-content]');
  if (!loading || !content) return;

  try {
    const { tiers, currentTier } = await fetchPricingData();
    setElementHtml(
      content,
      renderPricingPlans({
        tiers,
        currentTier,
        selectedTier: root.dataset.selectedTier || null,
        isProcessing: root.dataset.processing === 'true',
      }),
    );

    content.querySelectorAll<HTMLElement>('[data-pricing-select]').forEach((button) => {
      button.addEventListener('click', () => {
        const tierId = button.dataset.pricingSelect;
        if (!tierId || root.dataset.processing === 'true') return;
        void handleCheckout(root, tierId);
      });
    });
  } catch (error) {
    setElementHtml(
      content,
      renderPricingError(
        error instanceof Error ? error.message : 'Fiyatlandırma planları yüklenemedi',
      ),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initPricingPlans() {
  const roots = Array.from(document.querySelectorAll<PricingRoot>('[data-pricing-plans]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.selectedTier = '';
    root.dataset.processing = 'false';
    void renderPricingRoot(root);
  }
}
