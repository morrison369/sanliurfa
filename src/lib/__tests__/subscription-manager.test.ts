import { describe, expect, it } from 'vitest';

import {
  extractSubscription,
  extractSubscriptionMessage,
  renderSubscriptionManager,
} from '../subscription-manager';

describe('subscription manager helpers', () => {
  it('unwraps subscription envelope', () => {
    const subscription = extractSubscription({
      data: {
        success: true,
        subscription: {
          id: 'sub-1',
          tier: { displayName: 'Premium', monthlyPrice: 199 },
          status: 'active',
          startDate: '2026-04-17T00:00:00.000Z',
          autoRenew: true,
        },
      },
    });

    expect(subscription?.id).toBe('sub-1');
    expect(subscription?.tier.displayName).toBe('Premium');
  });

  it('renders active plan and message helper', () => {
    const html = renderSubscriptionManager({
      subscription: {
        id: 'sub-1',
        tier: { displayName: 'Premium', monthlyPrice: 199 },
        status: 'active',
        startDate: '2026-04-17T00:00:00.000Z',
        nextBillingDate: '2026-05-17T00:00:00.000Z',
        autoRenew: true,
      },
      error: null,
      cancelling: false,
      notice: null,
      noticeTone: null,
    });

    expect(html).toContain('Premium');
    expect(html).toContain('₺199');
    expect(html).toContain('Plan durumu');
    expect(html).toContain('Ödeme geçmişini aç');
    expect(extractSubscriptionMessage({ data: { success: true, message: 'Tamam' } }, 'Hata')).toBe('Tamam');
  });
});

