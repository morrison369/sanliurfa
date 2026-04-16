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
  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});

  const root = createInteractiveElement({ placeId: 'p1' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-marketing-campaign-loading]') return loading;
    if (selector === '[data-marketing-campaign-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('marketing campaign builder script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders campaigns data', async () => {
    const { root, loading, content } = createRoot();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          data: [{ id: 'c1', place_id: 'p1', name: 'Kampanya', campaign_type: 'promotion', status: 'draft', budget: 100, spent: 10, created_at: '2026-04-01T00:00:00.000Z' }],
        },
      }),
    });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initMarketingCampaignBuilder } = await import('../marketing-campaign-builder');
    initMarketingCampaignBuilder();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Pazarlama Kampanyaları');
    expect(content.innerHTML).toContain('Kampanya');
    expect(loading.className).toBe('hidden');
  });
});
