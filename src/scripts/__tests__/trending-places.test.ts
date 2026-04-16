import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  querySelector: (selector: string) => FakeElement | null;
};

function createTrendingRoot() {
  const loading: FakeElement = {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: {},
    querySelector: () => null,
  };

  const content: FakeElement = {
    textContent: '',
    className: 'hidden',
    innerHTML: '',
    dataset: {},
    querySelector: () => null,
  };

  const root: FakeElement = {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: {},
    querySelector: (selector: string) => {
      if (selector === '[data-trending-loading]') return loading;
      if (selector === '[data-trending-content]') return content;
      return null;
    },
  };

  return { root, loading, content };
}

describe('trending places script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders fetched trending places', async () => {
    const { root, loading, content } = createTrendingRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'gobeklitepe',
            name: 'Göbeklitepe',
            category: 'Tarihi Yer',
            rating: 5,
            review_count: 120,
            engagement_score: 99,
          },
        ],
      }),
    });

    const { initTrendingPlaces } = await import('../trending-places');
    initTrendingPlaces();
    await Promise.resolve();
    await Promise.resolve();

    expect(content.innerHTML).toContain('Göbeklitepe');
    expect(loading.className).toBe('hidden');
    expect(content.className).toContain('max-h-96');
    expect(root.dataset.initialized).toBe('true');
  });
});
