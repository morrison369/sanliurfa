import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  listeners?: Record<string, Array<(event?: any) => void | Promise<void>>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: any) => void | Promise<void>) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: (event?: any) => void | Promise<void>) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createActivityRoot() {
  let cachedHtml = '';
  let filterButtons: FakeElement[] = [];
  let loadMore: FakeElement | null = null;

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});

  function hydrate() {
    if (cachedHtml === content.innerHTML) return;
    cachedHtml = content.innerHTML;
    filterButtons = Array.from(content.innerHTML.matchAll(/data-activity-filter="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ activityFilter: match[1] }),
    );
    loadMore = content.innerHTML.includes('data-activity-load-more') ? createInteractiveElement({}) : null;
  }

  content.querySelector = (selector: string) => {
    hydrate();
    if (selector === '[data-activity-load-more]') return loadMore;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    hydrate();
    if (selector === '[data-activity-filter]') return filterButtons;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-activity-feed-loading]') return loading;
    if (selector === '[data-activity-feed-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('activity feed script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads feed, changes filter and loads more', async () => {
    const { root, loading, content } = createActivityRoot();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'act-1',
              user_id: 'user-1',
              user_name: 'Ali Kaya',
              user_username: 'alikaya',
              user_avatar: null,
              user_level: 3,
              action_type: 'review_created',
              reference_type: 'place',
              reference_id: 'place-1',
              metadata: { placeName: 'Gumruk Han' },
              created_at: '2026-04-17T00:00:00.000Z',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initActivityFeed } = await import('../activity-feed');
    initActivityFeed();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Ali Kaya');
    expect(loading.className).toBe('hidden');
    expect(fetchMock).toHaveBeenCalledWith('/api/feed/activity?filter=all&limit=20&offset=0', { credentials: 'same-origin' });

    const reviewsButton = content.querySelectorAll('[data-activity-filter]')[1];
    await reviewsButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/api/feed/activity?filter=reviews&limit=20&offset=0', { credentials: 'same-origin' });

    const loadMoreButton = content.querySelector('[data-activity-load-more]');
    if (loadMoreButton) {
      await loadMoreButton.listeners?.click?.[0]?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(content.innerHTML).toContain('Aktivite yok');
  });
});
