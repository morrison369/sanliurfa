import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: () => void) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createRoot() {
  let cachedHtml = '';
  let tabButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabButtons = Array.from(
        content.innerHTML.matchAll(/data-subscription-admin-tab="([^"]+)"/g),
      ).map((match) => createInteractiveElement({ subscriptionAdminTab: match[1] }));
    }

    if (selector === '[data-subscription-admin-tab]') return tabButtons;
    return [];
  };

  const root = createInteractiveElement({ activeTab: 'overview' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-subscription-admin-loading]') return loading;
    if (selector === '[data-subscription-admin-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('subscription admin dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders analytics and switches tabs', async () => {
    const { root, loading, content } = createRoot();
    const fetchAdminSubscriptionAnalytics = vi.fn().mockResolvedValue({
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

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminSubscriptionAnalytics,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initSubscriptionAdminDashboard } = await import('../subscription-admin-dashboard');
    initSubscriptionAdminDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Toplam Abonelik');
    expect(loading.className).toBe('hidden');

    const webhooksButton = content.querySelectorAll('[data-subscription-admin-tab]')[2];
    webhooksButton.listeners?.click?.[0]?.();

    expect(content.innerHTML).toContain("Webhook'lar");
    expect(content.innerHTML).toContain('Başarılı');
  });
});
