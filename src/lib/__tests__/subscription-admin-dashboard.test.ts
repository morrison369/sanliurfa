import { describe, expect, it } from 'vitest';

import {
  extractSubscriptionAdminAnalytics,
  normalizeSubscriptionAdminTab,
  renderSubscriptionAdminDashboard,
} from '../subscription-admin-dashboard';

describe('subscription admin dashboard helpers', () => {
  it('extracts analytics payload', () => {
    const analytics = extractSubscriptionAdminAnalytics({
      success: true,
      subscriptions: {
        totalSubscriptions: 20,
        activeSubscriptions: 12,
        cancelledSubscriptions: 8,
        byTier: { Premium: 7, Business: 5 },
        mrr: 1200,
        arr: 14400,
        averageLifetimeValue: 320,
        churnRate: 4.5,
      },
      webhooks: {
        pending: 1,
        failed: 2,
        successful: 18,
        retrying: 1,
        lastDelivery: '2026-04-17T00:00:00.000Z',
      },
      timestamp: '2026-04-17T00:00:00.000Z',
    });

    expect(analytics?.subscriptions.totalSubscriptions).toBe(20);
    expect(analytics?.webhooks.successful).toBe(18);
  });

  it('normalizes tab values', () => {
    expect(normalizeSubscriptionAdminTab('users')).toBe('users');
    expect(normalizeSubscriptionAdminTab('bad')).toBe('overview');
  });

  it('renders overview html', () => {
    const html = renderSubscriptionAdminDashboard({
      activeTab: 'overview',
      error: null,
      analytics: {
        success: true,
        subscriptions: {
          totalSubscriptions: 20,
          activeSubscriptions: 12,
          cancelledSubscriptions: 8,
          byTier: { Premium: 7, Business: 5 },
          mrr: 1200,
          arr: 14400,
          averageLifetimeValue: 320,
          churnRate: 4.5,
        },
        webhooks: {
          pending: 1,
          failed: 2,
          successful: 18,
          retrying: 1,
          lastDelivery: '2026-04-17T00:00:00.000Z',
        },
        timestamp: '2026-04-17T00:00:00.000Z',
      },
    });

    expect(html).toContain('Toplam Abonelik');
    expect(html).toContain('Plan Dağılımı');
    expect(html).toContain('₺1200.00');
  });
});
