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

function createButton(tierId: string): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: { pricingSelect: tierId },
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
  for (let i = 0; i < 6; i += 1) {
    await Promise.resolve();
  }
}

function createPricingRoot() {
  const loading: FakeElement = createButton('');
  let cachedHtml = '';
  let cachedButtons: FakeElement[] = [];
  const content: FakeElement = {
    textContent: '',
    className: 'hidden',
    innerHTML: '',
    dataset: {},
    listeners: {},
    querySelector: () => null,
    querySelectorAll: (selector: string) => {
      if (selector !== '[data-pricing-select]') return [];
      if (cachedHtml !== content.innerHTML) {
        cachedHtml = content.innerHTML;
        const matches = Array.from(content.innerHTML.matchAll(/data-pricing-select="([^"]+)"/g));
        cachedButtons = matches.map((match) => createButton(match[1]));
      }
      return cachedButtons;
    },
    addEventListener: () => {},
  };

  const root: FakeElement = {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: {},
    listeners: {},
    querySelector: (selector: string) => {
      if (selector === '[data-pricing-loading]') return loading;
      if (selector === '[data-pricing-content]') return content;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  return { root, loading, content };
}

describe('pricing plans script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads tiers, unwraps api response and triggers checkout', async () => {
    const { root, loading, content } = createPricingRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const alertMock = vi.fn();
    (globalThis as any).window = {
      alert: alertMock,
      location: { href: '' },
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (input === '/api/subscriptions/tiers') {
        return {
          ok: true,
          json: async () => ({
            data: {
              tiers: [
                {
                  id: 'tier-pro',
                  name: 'pro',
                  displayName: 'Pro',
                  monthlyPrice: 199,
                  tierLevel: 2,
                  features: [],
                },
              ],
            },
          }),
        };
      }

      if (input === '/api/user/subscription') {
        return {
          ok: true,
          json: async () => ({
            data: {
              subscription: {
                tier: { id: 'tier-free', name: 'free' },
              },
            },
          }),
        };
      }

      if (input === '/api/subscriptions/checkout' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              checkoutUrl: '/odeme/pro',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initPricingPlans } = await import('../pricing-plans');
    initPricingPlans();
    await flushPromises();

    expect(content.innerHTML).toContain('Pro');
    expect(content.innerHTML).toContain('Seç');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');

    const button = content.querySelectorAll('[data-pricing-select]')[0];
    await button.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscriptions/checkout',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(alertMock).not.toHaveBeenCalled();
  });
});
