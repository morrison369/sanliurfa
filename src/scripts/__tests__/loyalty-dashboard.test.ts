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

function createLoyaltyRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'loading';

  let cachedHtml = '';
  let tabs: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-loyalty-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ loyaltyTab: match[1] }),
      );
    }

    if (selector === '[data-loyalty-tab]') return tabs;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-loyalty-loading]') return loading;
    if (selector === '[data-loyalty-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('loyalty dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads loyalty data and switches tabs', async () => {
    const { root, loading, content } = createLoyaltyRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string) => {
      if (input === '/api/user/loyalty?section=all') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                balance: {
                  total_points: 1200,
                  available_points: 900,
                  current_tier: 'gümüş',
                  lifetime_points: 2400,
                },
                tiers: [
                  { tier_name: 'bronz', tier_level: 1, min_points: 0, point_multiplier: 0.1 },
                  { tier_name: 'gümüş', tier_level: 2, min_points: 1000, point_multiplier: 0.2 },
                  { tier_name: 'altın', tier_level: 3, min_points: 2000, point_multiplier: 0.3 },
                ],
                achievements: {
                  total_unlocked: 3,
                  total_available: 10,
                  unlock_percentage: 30,
                },
              },
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initLoyaltyDashboard } = await import('../loyalty-dashboard');
    initLoyaltyDashboard();
    await flushPromises();

    expect(content.innerHTML).toContain('Seviye Avantajları');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.activeTab).toBe('overview');

    const rewardsTab = content.querySelectorAll('[data-loyalty-tab]')[1];
    rewardsTab.listeners?.click?.[0]?.();

    expect(root.dataset.activeTab).toBe('rewards');
    expect(content.innerHTML).toContain('/loyalty/rewards');
  });
});
