import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  value?: string;
  href?: string;
  listeners?: Record<string, Array<(event?: { currentTarget: FakeElement }) => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: { currentTarget: FakeElement }) => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value = '', href = ''): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset,
    value,
    href,
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event, handler) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

async function flushPromises() {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
}

function createRoot(query = 'urfa') {
  const loading = createInteractiveElement({});
  loading.className = 'loading';

  let cachedHtml = '';
  let input: FakeElement | null = null;
  let clearButton: FakeElement | null = null;
  let retryButton: FakeElement | null = null;
  let recentButtons: FakeElement[] = [];
  let resultItems: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.className = 'hidden';
  function hydrate() {
    if (cachedHtml === content.innerHTML) return;
    cachedHtml = content.innerHTML;
    input = content.innerHTML.includes('data-search-results-input')
      ? createInteractiveElement({}, query)
      : null;
    clearButton = content.innerHTML.includes('data-search-results-clear')
      ? createInteractiveElement({})
      : null;
    retryButton = content.innerHTML.includes('data-search-results-retry')
      ? createInteractiveElement({})
      : null;
    recentButtons = Array.from(content.innerHTML.matchAll(/data-search-results-recent-query="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ searchResultsRecentQuery: match[1] }),
    );
    resultItems = Array.from(content.innerHTML.matchAll(/<a href="([^"]+)" data-search-results-item[^>]*data-search-results-index="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ searchResultsIndex: match[2] }, '', match[1]),
    );
  }
  content.querySelector = (selector: string) => {
    hydrate();
    if (selector === '[data-search-results-input]') return input;
    if (selector === '[data-search-results-clear]') return clearButton;
    if (selector === '[data-search-results-retry]') return retryButton;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    hydrate();
    if (selector === '[data-search-results-recent-query]') return recentButtons;
    if (selector === '[data-search-results-item]') return resultItems;
    return [];
  };

  const root = createInteractiveElement({ query });
  root.querySelector = (selector: string) => {
    if (selector === '[data-search-results-loading]') return loading;
    if (selector === '[data-search-results-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('search-results script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads initial query and renders place, user and collection results', async () => {
    const { root, loading, content } = createRoot();
    const localStorageStore = new Map<string, string>();
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      location: { href: 'https://sanliurfa.com/arama?q=urfa' },
      history: { replaceState: vi.fn() },
      localStorage: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageStore.set(key, value),
        removeItem: (key: string) => localStorageStore.delete(key),
      },
    };

    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith('/api/search?')) {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: { results: [{ id: 'p1', name: 'Göbeklitepe', category: 'Tarihi Yer' }] } },
          }),
        };
      }
      if (input.startsWith('/api/users/search?')) {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: [{ id: 'u1', full_name: 'Ali Kaya', username: 'ali' }] },
          }),
        };
      }
      if (input === '/api/collections?public=true&limit=50') {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: [{ id: 'c1', name: 'Urfa Koleksiyonu', description: 'Seçkiler' }] },
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${input}`);
    });
    (globalThis as any).fetch = fetchMock;

    const { initSearchResults } = await import('../search-results');
    initSearchResults();
    await flushPromises();

    expect(content.innerHTML).toContain('Göbeklitepe');
    expect(content.innerHTML).toContain('Ali Kaya');
    expect(content.innerHTML).toContain('Urfa Koleksiyonu');
    expect(content.innerHTML).toContain('Arama özeti');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(localStorageStore.get('sanliurfa:search-results:query')).toBe('urfa');
  });

  it('clears query and url when clear action is used', async () => {
    const { root, content } = createRoot();
    const localStorageStore = new Map<string, string>();
    const replaceState = vi.fn();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      location: { href: 'https://sanliurfa.com/arama?q=urfa' },
      history: { replaceState },
      localStorage: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageStore.set(key, value),
        removeItem: (key: string) => localStorageStore.delete(key),
      },
    };

    (globalThis as any).fetch = vi.fn(async (input: string) => {
      if (input.startsWith('/api/search?')) {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: { results: [] } },
          }),
        };
      }
      if (input.startsWith('/api/users/search?')) {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: [] },
          }),
        };
      }
      if (input === '/api/collections?public=true&limit=50') {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: [] },
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${input}`);
    });

    const { initSearchResults } = await import('../search-results');
    initSearchResults();
    await flushPromises();

    const clearButton = content.querySelector('[data-search-results-clear]');
    clearButton?.listeners?.click?.[0]?.();
    await flushPromises();

    expect(content.innerHTML).toContain('Aramaya başlamak için 2 karakter daha girin');
    expect(localStorageStore.get('sanliurfa:search-results:query')).toBeUndefined();
    expect(replaceState).toHaveBeenLastCalledWith({}, '', '/arama');
  });

  it('renders recent searches and navigates active result with keyboard', async () => {
    const { root, content } = createRoot('');
    const localStorageStore = new Map<string, string>([
      ['sanliurfa:search-results:recent-queries', JSON.stringify(['balikli gol', 'gobeklitepe'])],
    ]);
    const assign = vi.fn();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      location: { href: 'https://sanliurfa.com/arama', assign },
      history: { replaceState: vi.fn() },
      localStorage: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageStore.set(key, value),
        removeItem: (key: string) => localStorageStore.delete(key),
      },
    };

    (globalThis as any).fetch = vi.fn(async (input: string) => {
      if (input.startsWith('/api/search?')) {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: { results: [{ id: 'p1', name: 'Balıklıgöl', category: 'Tarihi Yer' }] } },
          }),
        };
      }
      if (input.startsWith('/api/users/search?')) {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: [] },
          }),
        };
      }
      if (input === '/api/collections?public=true&limit=50') {
        return {
          ok: true,
          json: async () => ({
            data: { success: true, data: [] },
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${input}`);
    });

    const { initSearchResults } = await import('../search-results');
    initSearchResults();
    await flushPromises();

    expect(content.innerHTML).toContain('Son aramalar');
    expect(content.querySelectorAll('[data-search-results-recent-query]')).toHaveLength(2);

    const recentButton = content.querySelectorAll('[data-search-results-recent-query]')[0];
    recentButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(content.innerHTML).toContain('Balıklıgöl');

    const input = content.querySelector('[data-search-results-input]');
    if (!input) throw new Error('search input missing');

    input.listeners?.keydown?.[0]?.({
      key: 'ArrowDown',
      preventDefault: vi.fn(),
      currentTarget: input,
    } as any);
    await flushPromises();

    expect(content.innerHTML).toContain('ring-2 ring-blue-500');

    input.listeners?.keydown?.[0]?.({
      key: 'Enter',
      preventDefault: vi.fn(),
      currentTarget: input,
    } as any);

    expect(assign).toHaveBeenCalledWith('/yerler/p1');
  });
});
