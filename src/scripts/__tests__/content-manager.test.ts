import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  value?: string;
  dataset: Record<string, string>;
  listeners?: Record<string, Array<(event?: { preventDefault: () => void }) => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: { preventDefault: () => void }) => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    value: '',
    dataset,
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: (event?: { preventDefault: () => void }) => void) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

async function flushPromises() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function createContentRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'p-4 text-center text-gray-500';

  let cachedHtml = '';
  let openForm: FakeElement | null = null;
  let form: FakeElement | null = null;
  let cancel: FakeElement | null = null;
  let publishButtons: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) hydrate();
    if (selector === '[data-content-manager-open-form]') return openForm;
    if (selector === '[data-content-manager-form]') return form;
    if (selector === '[data-content-manager-cancel]') return cancel;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) hydrate();
    if (selector === '[data-content-manager-publish]') return publishButtons;
    return [];
  };

  function hydrate() {
    cachedHtml = content.innerHTML;
    openForm = content.innerHTML.includes('data-content-manager-open-form') ? createInteractiveElement({}) : null;
    form = content.innerHTML.includes('data-content-manager-form') ? createInteractiveElement({}) : null;
    cancel = content.innerHTML.includes('data-content-manager-cancel') ? createInteractiveElement({}) : null;
    publishButtons = Array.from(content.innerHTML.matchAll(/data-content-manager-publish="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ contentManagerPublish: match[1] }),
    );
  }

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-content-manager-loading]') return loading;
    if (selector === '[data-content-manager-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('content manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads content list and publishes draft', async () => {
    const { root, content, loading } = createContentRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (input === '/api/content') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: [
                {
                  id: 'c1',
                  title: 'Makale',
                  status: 'draft',
                  visibility: 'private',
                  view_count: 0,
                  like_count: 0,
                  created_at: '2026-04-17T00:00:00.000Z',
                },
              ],
            },
          }),
        };
      }

      if (input === '/api/content/c1/publish' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ data: { success: true, message: 'Yayınlandı' } }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initContentManager } = await import('../content-manager');
    initContentManager();
    await flushPromises();

    expect(content.innerHTML).toContain('Makale');
    expect(content.innerHTML).toContain('Yayınla');
    expect(loading.className).toBe('hidden');

    const publishButton = content.querySelectorAll('[data-content-manager-publish]')[0];
    await publishButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith('/api/content/c1/publish', expect.objectContaining({ method: 'POST' }));
  });
});
