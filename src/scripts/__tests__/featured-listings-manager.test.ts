import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  listeners?: Record<string, Array<(event?: unknown) => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: unknown) => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: (event?: unknown) => void) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createRoot() {
  let cachedHtml = '';
  let toggles: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelector = (selector: string) => {
    if (selector === '[data-featured-listings-toggle]') return toggles[0] || null;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      toggles = Array.from(content.innerHTML.matchAll(/data-featured-listings-toggle/g)).map(() =>
        createInteractiveElement({}),
      );
    }

    if (selector === '[data-featured-listing-delete]') return [];
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-featured-listings-loading]') return loading;
    if (selector === '[data-featured-listings-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('featured listings manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders featured listings data', async () => {
    const { root, loading, content } = createRoot();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          data: [{ id: 'l1', title: 'Liste', place_id: 'p1', position_tier: 'standard', start_date: '2026-04-01', end_date: '2026-04-05', status: 'active', views_count: 5, clicks_count: 2, conversions_count: 0, cost_per_day: 10, total_cost: 50 }],
        },
      }),
    });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initFeaturedListingsManager } = await import('../featured-listings-manager');
    initFeaturedListingsManager();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Yeminli Listeler');
    expect(content.innerHTML).toContain('Liste');
    expect(loading.className).toBe('hidden');
  });
});
