import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  listeners?: Record<string, Array<() => Promise<void> | void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => Promise<void> | void) => void;
};

function createFollowButton(userId: string): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: { userFollow: userId },
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: () => Promise<void> | void) {
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

function createRecommendationsRoot() {
  const loading: FakeElement = createFollowButton('');
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
      if (selector !== '[data-user-follow]') return [];
      if (cachedHtml !== content.innerHTML) {
        cachedHtml = content.innerHTML;
        const matches = Array.from(content.innerHTML.matchAll(/data-user-follow="([^"]+)"/g));
        cachedButtons = matches.map((match) => createFollowButton(match[1]));
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
      if (selector === '[data-user-recommendations-loading]') return loading;
      if (selector === '[data-user-recommendations-content]') return content;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  return { root, loading, content };
}

describe('user recommendations script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders recommendations and rebinds follow toggle after rerender', async () => {
    const { root, loading, content } = createRecommendationsRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'user-1',
              full_name: 'Ayşe Kaya',
              avatar_url: null,
              level: 4,
              review_count: 9,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    (globalThis as any).fetch = fetchMock;

    const { initUserRecommendations } = await import('../user-recommendations');
    initUserRecommendations();
    await flushPromises();

    expect(content.innerHTML).toContain('Ayşe Kaya');
    expect(content.innerHTML).toContain('Takip Et');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');

    let button = content.querySelectorAll('[data-user-follow]')[0];
    await button.listeners?.click?.[0]?.();
    await flushPromises();

    expect(content.innerHTML).toContain('Takibi Bırak');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/followers/user-1', { method: 'POST' });

    button = content.querySelectorAll('[data-user-follow]')[0];
    await button.listeners?.click?.[0]?.();
    await flushPromises();

    expect(content.innerHTML).toContain('Takip Et');
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/followers/user-1', { method: 'DELETE' });
  });
});
