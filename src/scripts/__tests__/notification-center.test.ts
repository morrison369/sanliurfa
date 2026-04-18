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

async function waitFor(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createCenterRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'py-8 text-center text-gray-500';

  let cachedHtml = '';
  let filters: FakeElement[] = [];
  let actions: FakeElement[] = [];
  let refreshButtons: FakeElement[] = [];
  let retryButtons: FakeElement[] = [];
  let markAllButtons: FakeElement[] = [];

  const content: FakeElement = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      filters = Array.from(content.innerHTML.matchAll(/data-notifications-filter="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ notificationsFilter: match[1] }),
      );
      actions = Array.from(content.innerHTML.matchAll(/data-notification-action="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ notificationAction: match[1] }),
      );
      refreshButtons = Array.from(content.innerHTML.matchAll(/data-notification-center-refresh/g)).map(() =>
        createInteractiveElement({}),
      );
      retryButtons = Array.from(content.innerHTML.matchAll(/data-notification-center-retry/g)).map(() =>
        createInteractiveElement({}),
      );
      markAllButtons = Array.from(content.innerHTML.matchAll(/data-notification-center-mark-all/g)).map(() =>
        createInteractiveElement({}),
      );
    }

    if (selector === '[data-notifications-filter]') return filters;
    if (selector === '[data-notification-action]') return actions;
    if (selector === '[data-notification-center-refresh]') return refreshButtons;
    if (selector === '[data-notification-center-retry]') return retryButtons;
    if (selector === '[data-notification-center-mark-all]') return markAllButtons;
    return [];
  };

  const root: FakeElement = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-notification-center-loading]') return loading;
    if (selector === '[data-notification-center-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('notification center script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads center data, runs bulk mark-all action and retries after error', async () => {
    const { root, loading, content } = createCenterRoot();
    let failingCenterFetches = 0;

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (typeof input === 'string' && input.startsWith('/api/notifications/center?') && failingCenterFetches > 0) {
        failingCenterFetches -= 1;
        return {
          ok: false,
          json: async () => ({
            error: {
              message: 'Geçici hata',
            },
          }),
        };
      }

      if (typeof input === 'string' && input.startsWith('/api/notifications/center?')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                notifications: [
                  {
                    id: 'n1',
                    notification_type: 'message',
                    title: 'Yeni mesaj',
                    message: 'Detay',
                    is_read: false,
                    is_archived: false,
                    created_at: '2026-04-17T00:00:00.000Z',
                  },
                ],
                unreadCount: 2,
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
              message: 'Tümü okundu olarak işaretlendi',
            },
          }),
        };
      }

      if (input === '/api/notifications/center' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              message: 'Bildirim işlemi tamamlandı: read',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initNotificationCenter } = await import('../notification-center');
    initNotificationCenter();
    await flushPromises();

    expect(content.innerHTML).toContain('Yeni mesaj');
    expect(content.innerHTML).toContain('Bildirim merkezi');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');
    expect(content.querySelectorAll('[data-notification-center-mark-all]')).toHaveLength(1);

    const markAllButton = content.querySelectorAll('[data-notification-center-mark-all]')[0];
    await markAllButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/read-all',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(content.innerHTML).toContain('Tüm bildirimler okundu olarak işaretlendi.');

    const actionButton = content.querySelectorAll('[data-notification-action]')[0];
    await actionButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/center',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(content.innerHTML).toContain('Bildirim merkezi güncellendi.');
    expect(content.querySelectorAll('[data-notification-center-refresh]')).toHaveLength(1);

    failingCenterFetches = 2;
    const refreshButton = content.querySelectorAll('[data-notification-center-refresh]')[0];
    await refreshButton.listeners?.click?.[0]?.();
    await flushPromises();
    await waitFor(250);
    await flushPromises();

    expect(content.querySelectorAll('[data-notification-center-retry]')).toHaveLength(1);

    failingCenterFetches = 0;
    const retryButton = content.querySelectorAll('[data-notification-center-retry]')[0];
    await retryButton.listeners?.click?.[0]?.();
    await flushPromises();
    await waitFor(250);
    await flushPromises();

    expect(content.innerHTML).toContain('Yeni mesaj');
  });
});
