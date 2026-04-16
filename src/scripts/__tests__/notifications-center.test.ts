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

function createNotificationsRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'py-8 text-center text-gray-500';

  let cachedHtml = '';
  let filters: FakeElement[] = [];
  let actions: FakeElement[] = [];
  let markAll: FakeElement | null = null;

  const content: FakeElement = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (selector === '[data-notifications-center-mark-all]') {
      if (cachedHtml !== content.innerHTML) {
        cachedHtml = content.innerHTML;
      }
      return markAll;
    }
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      filters = Array.from(content.innerHTML.matchAll(/data-notifications-center-filter="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ notificationsCenterFilter: match[1] }),
      );
      actions = Array.from(content.innerHTML.matchAll(/data-notifications-center-action="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ notificationsCenterAction: match[1] }),
      );
      markAll = content.innerHTML.includes('data-notifications-center-mark-all')
        ? createInteractiveElement({})
        : null;
    }

    if (selector === '[data-notifications-center-filter]') return filters;
    if (selector === '[data-notifications-center-action]') return actions;
    return [];
  };

  const root: FakeElement = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-notifications-center-loading]') return loading;
    if (selector === '[data-notifications-center-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('notifications center script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads notifications and runs read-all action with correct methods', async () => {
    const { root, loading, content } = createNotificationsRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (typeof input === 'string' && input.startsWith('/api/notifications?')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                data: [
                  {
                    id: 'n1',
                    type: 'message',
                    message: 'Detay',
                    created_at: '2026-04-17T00:00:00.000Z',
                    read_at: null,
                  },
                ],
                count: 1,
                filter: 'all',
              },
            },
          }),
        };
      }

      if (input === '/api/notifications/read-all' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              message: 'Tamam',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initNotificationsCenter } = await import('../notifications-center');
    initNotificationsCenter();
    await flushPromises();

    expect(content.innerHTML).toContain('Bildirimler');
    expect(content.innerHTML).toContain('Detay');
    expect(content.innerHTML).toContain('Tümünü Oku');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');

    const markAllButton = content.querySelector('[data-notifications-center-mark-all]');
    await markAllButton?.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/read-all',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
