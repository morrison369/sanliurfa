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

function createCollectionRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'loading';

  let cachedHtml = '';
  let followButton: FakeElement | null = null;
  let removeButtons: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      followButton = content.innerHTML.includes('data-collection-follow') ? createInteractiveElement({}) : null;
      removeButtons = Array.from(content.innerHTML.matchAll(/data-collection-remove-item="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ collectionRemoveItem: match[1] }),
      );
    }
    if (selector === '[data-collection-follow]') return followButton;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      followButton = content.innerHTML.includes('data-collection-follow') ? createInteractiveElement({}) : null;
      removeButtons = Array.from(content.innerHTML.matchAll(/data-collection-remove-item="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ collectionRemoveItem: match[1] }),
      );
    }
    if (selector === '[data-collection-remove-item]') return removeButtons;
    return [];
  };

  const root = createInteractiveElement({
    collectionId: 'c1',
    currentUserId: 'u2',
  });
  root.querySelector = (selector: string) => {
    if (selector === '[data-collection-detail-loading]') return loading;
    if (selector === '[data-collection-detail-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('collection detail script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads detail and toggles follow with correct endpoint', async () => {
    const { root, loading, content } = createCollectionRoot();
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      alert: vi.fn(),
      confirm: vi.fn(() => true),
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (input === '/api/collections/c1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                collection: {
                  id: 'c1',
                  user_id: 'u1',
                  name: 'Favoriler',
                  icon: '📍',
                  is_public: true,
                  place_count: 1,
                  follower_count: 5,
                },
                items: [
                  {
                    id: 'i1',
                    place_id: 'p1',
                    place_name: 'Göbeklitepe',
                    position: 1,
                    added_at: '2026-04-17T00:00:00.000Z',
                  },
                ],
              },
            },
          }),
        };
      }

      if (input === '/api/collections/c1/follow' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              following: true,
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });
    (globalThis as any).fetch = fetchMock;

    const { initCollectionDetail } = await import('../collection-detail');
    initCollectionDetail();
    await flushPromises();

    expect(content.innerHTML).toContain('Favoriler');
    expect(content.innerHTML).toContain('Takip Et');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');

    const followButton = content.querySelector('[data-collection-follow]');
    await followButton?.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/collections/c1/follow',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(root.dataset.isFollowing).toBe('true');
  });
});
