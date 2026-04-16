import { describe, expect, it } from 'vitest';

import { renderPricingError, renderPricingPlans } from '../pricing-plans';

describe('pricing plans helpers', () => {
  it('renders pricing cards and marks current plan', () => {
    const html = renderPricingPlans({
      tiers: [
        {
          id: 'tier-pro',
          name: 'pro',
          displayName: 'Pro',
          monthlyPrice: 299,
          annualPrice: 2990,
          tierLevel: 2,
          features: [{ featureName: 'Özel rozet' }],
        },
      ],
      currentTier: 'tier-pro',
      selectedTier: null,
      isProcessing: false,
    });

    expect(html).toContain('Pro');
    expect(html).toContain('₺299');
    expect(html).toContain('✓ Mevcut Plan');
    expect(html).toContain('Özel rozet');
  });

  it('renders pricing error state', () => {
    expect(renderPricingError('Yüklenemedi')).toContain('Yüklenemedi');
  });
});
