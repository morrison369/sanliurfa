import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset,
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

async function flushPromises() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

function createSubscriptionRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'h-40 animate-pulse rounded-lg bg-gray-200';

  let cachedHtml = '';
  let cancelButtons: FakeElement[] = [];

  const content: FakeElement = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      cancelButtons = Array.from(content.innerHTML.matchAll(/data-subscription-cancel/g)).map(() =>
        createInteractiveElement({}),
      );
    }

    if (selector === '[data-subscription-cancel]') return cancelButtons[0] || null;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      cancelButtons = Array.from(content.innerHTML.matchAll(/data-subscription-cancel/g)).map(() =>
        createInteractiveElement({}),
      );
    }

    if (selector === '[data-subscription-cancel]') return cancelButtons;
    return [];
  };

  const root: FakeElement = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-subscription-loading]') return loading;
    if (selector === '[data-subscription-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('subscription manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads subscription and handles cancel flow', async () => {
    const { root, loading, content } = createSubscriptionRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const confirmMock = vi.fn(() => true);
    (globalThis as any).window = {
      confirm: confirmMock,
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (input === '/api/user/subscription') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              subscription: {
                id: 'sub-1',
                tier: { displayName: 'Premium', monthlyPrice: 199 },
                status: 'active',
                startDate: '2026-04-17T00:00:00.000Z',
                nextBillingDate: '2026-05-17T00:00:00.000Z',
                autoRenew: true,
              },
            },
          }),
        };
      }

      if (input === '/api/subscriptions/cancel' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              message: 'Abonelik başarıyla iptal edildi. Plan aylık sonunda sona erecektir.',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initSubscriptionManager } = await import('../subscription-manager');
    initSubscriptionManager();
    await flushPromises();

    expect(content.innerHTML).toContain('Premium');
    expect(content.innerHTML).toContain('Aktif plan');
    expect(content.innerHTML).toContain('Plan durumu');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');

    const cancelButton = content.querySelectorAll('[data-subscription-cancel]')[0];
    await cancelButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscriptions/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(content.innerHTML).toContain('Abonelik güncellemesi');
    expect(content.innerHTML).toContain('Abonelik başarıyla iptal edildi');
  });
});


