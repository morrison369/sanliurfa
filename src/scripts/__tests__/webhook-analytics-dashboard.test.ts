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
  let refreshButton: FakeElement | null = null;

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML || !refreshButton) {
      cachedHtml = content.innerHTML;
      refreshButton = content.innerHTML.includes('data-webhook-analytics-refresh')
        ? createInteractiveElement({})
        : null;
    }

    if (selector === '[data-webhook-analytics-refresh]') return refreshButton;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML || tabButtons.length === 0) {
      cachedHtml = content.innerHTML;
      tabButtons = Array.from(content.innerHTML.matchAll(/data-webhook-analytics-tab="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ webhookAnalyticsTab: match[1] }),
      );
    }

    if (selector === '[data-webhook-analytics-tab]') return tabButtons;
    return [];
  };

  const root = createInteractiveElement({ token: 'token-1' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-webhook-analytics-loading]') return loading;
    if (selector === '[data-webhook-analytics-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('webhook analytics dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders metrics and switches tabs', async () => {
    const { root, loading, content } = createRoot();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          data: {
            totalWebhooks: 3,
            totalEvents: 50,
            deliveredEvents: 44,
            failedEvents: 4,
            pendingEvents: 2,
            successRate: 88,
            avgDeliveryTime: 120,
            byEvent: {
              'place.created': { total: 10, delivered: 9, failed: 1, pending: 0, successRate: 90 },
            },
            lastHourActivity: [{ time: '2026-04-17T00:00:00.000Z', sent: 3, delivered: 2, failed: 1 }],
            topFailedEvents: [{ event: 'place.created', failedCount: 2, attempts: 5 }],
          },
        },
      }),
    });

    const intervalMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    (globalThis as any).setInterval = intervalMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initWebhookAnalyticsDashboard } = await import('../webhook-analytics-dashboard');
    initWebhookAnalyticsDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Webhook Analitikleri');
    expect(content.innerHTML).toContain('Toplam Webhooks');
    expect(loading.className).toBe('hidden');
    expect(fetchMock).toHaveBeenCalledWith('/api/webhooks/analytics', {
      headers: { Authorization: 'Bearer token-1' },
    });
    expect(intervalMock).toHaveBeenCalled();

    const eventsButton = content.querySelectorAll('[data-webhook-analytics-tab]')[1];
    eventsButton.listeners?.click?.[0]?.();

    expect(content.innerHTML).toContain('Olay Türleri Başarı Oranları');
    expect(content.innerHTML).toContain('place.created');
  });
});
