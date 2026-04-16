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

function createRewardsRoot() {
  const loading: FakeElement = createInteractiveElement({});
  loading.className = 'space-y-4';

  let cachedHtml = '';
  let categoryButtons: FakeElement[] = [];
  let redeemButtons: FakeElement[] = [];

  const content: FakeElement = {
    textContent: '',
    className: 'hidden',
    innerHTML: '',
    dataset: {},
    listeners: {},
    querySelector: () => null,
    querySelectorAll: (selector: string) => {
      if (cachedHtml !== content.innerHTML) {
        cachedHtml = content.innerHTML;
        categoryButtons = Array.from(content.innerHTML.matchAll(/data-reward-category="([^"]+)"/g)).map((match) =>
          createInteractiveElement({ rewardCategory: match[1] }),
        );
        redeemButtons = Array.from(content.innerHTML.matchAll(/data-reward-redeem="([^"]+)"/g)).map((match) =>
          createInteractiveElement({ rewardRedeem: match[1] }),
        );
      }

      if (selector === '[data-reward-category]') return categoryButtons;
      if (selector === '[data-reward-redeem]') return redeemButtons;
      return [];
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
      if (selector === '[data-rewards-loading]') return loading;
      if (selector === '[data-rewards-content]') return content;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  return { root, loading, content };
}

describe('rewards catalog script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads catalog, unwraps nested envelope and redeems reward', async () => {
    const { root, loading, content } = createRewardsRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (typeof input === 'string' && input.startsWith('/api/loyalty/rewards?')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                rewards: [
                  {
                    id: 'reward-1',
                    reward_name: 'Filtre Kahve',
                    description: 'Bir adet ücretsiz içecek',
                    category: 'içecek',
                    points_cost: 250,
                    available_stock: 4,
                  },
                ],
                promotionalOffers: [
                  {
                    id: 'promo-1',
                    offer_name: 'Hafta Sonu İndirimi',
                    discount_percent: 20,
                    valid_from: '2026-04-16',
                    valid_until: '2026-04-20',
                  },
                ],
              },
            },
          }),
        };
      }

      if (input === '/api/loyalty/rewards' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                redemptionCode: 'RWD-ABC-123',
                message: 'Ödül başarıyla kazanıldı',
              },
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initRewardsCatalog } = await import('../rewards-catalog');
    initRewardsCatalog();
    await flushPromises();

    expect(content.innerHTML).toContain('Filtre Kahve');
    expect(content.innerHTML).toContain('Hafta Sonu İndirimi');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');

    const redeemButton = content.querySelectorAll('[data-reward-redeem]')[0];
    await redeemButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/loyalty/rewards',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(content.innerHTML).toContain('Kod: RWD-ABC-123');
  });
});
