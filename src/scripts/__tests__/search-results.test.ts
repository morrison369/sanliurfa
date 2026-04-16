import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  value?: string;
  listeners?: Record<string, Array<(event?: { currentTarget: FakeElement }) => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: { currentTarget: FakeElement }) => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value = ''): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset,
    value,
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

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      input = content.innerHTML.includes('data-search-results-input')
        ? createInteractiveElement({}, query)
        : null;
    }
    if (selector === '[data-search-results-input]') return input;
    return null;
  };
  content.querySelectorAll = () => [];

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
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      location: { href: 'https://sanliurfa.com/arama?q=urfa' },
      history: { replaceState: vi.fn() },
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
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
  });
});
