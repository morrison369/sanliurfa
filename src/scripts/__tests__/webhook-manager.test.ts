import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  value?: string;
  listeners?: Record<string, Array<(event?: any) => void | Promise<void>>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: any) => void | Promise<void>) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value = ''): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    value,
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

function createWebhookRoot() {
  let cachedHtml = '';
  let toggleButton: FakeElement | null = null;
  let form: FakeElement | null = null;
  let eventField: FakeElement | null = null;
  let urlField: FakeElement | null = null;
  let secretField: FakeElement | null = null;
  let cancelButton: FakeElement | null = null;
  let testButtons: FakeElement[] = [];
  let copyButtons: FakeElement[] = [];
  let deleteButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});

  function hydrate() {
    if (cachedHtml === content.innerHTML) return;
    cachedHtml = content.innerHTML;

    toggleButton = content.innerHTML.includes('data-webhook-toggle') ? createInteractiveElement({}) : null;
    form = content.innerHTML.includes('data-webhook-form') ? createInteractiveElement({}) : null;
    eventField = content.innerHTML.includes('data-webhook-event') ? createInteractiveElement({}, '') : null;
    urlField = content.innerHTML.includes('data-webhook-url') ? createInteractiveElement({}, '') : null;
    secretField = content.innerHTML.includes('data-webhook-secret') ? createInteractiveElement({}, '') : null;
    cancelButton = content.innerHTML.includes('data-webhook-cancel') ? createInteractiveElement({}) : null;
    testButtons = Array.from(content.innerHTML.matchAll(/data-webhook-test="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ webhookTest: match[1] }),
    );
    copyButtons = Array.from(content.innerHTML.matchAll(/data-webhook-copy="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ webhookCopy: match[1] }),
    );
    deleteButtons = Array.from(content.innerHTML.matchAll(/data-webhook-delete="([^"]+)"/g)).map((match) =>
      createInteractiveElement({ webhookDelete: match[1] }),
    );
  }

  content.querySelector = (selector: string) => {
    hydrate();
    if (selector === '[data-webhook-toggle]') return toggleButton;
    if (selector === '[data-webhook-form]') return form;
    if (selector === '[data-webhook-event]') return eventField;
    if (selector === '[data-webhook-url]') return urlField;
    if (selector === '[data-webhook-secret]') return secretField;
    if (selector === '[data-webhook-cancel]') return cancelButton;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    hydrate();
    if (selector === '[data-webhook-test]') return testButtons;
    if (selector === '[data-webhook-copy]') return copyButtons;
    if (selector === '[data-webhook-delete]') return deleteButtons;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-webhook-manager-loading]') return loading;
    if (selector === '[data-webhook-manager-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('webhook manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads webhooks then tests and deletes one', async () => {
    const { root, loading, content } = createWebhookRoot();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'wh-1',
              event: 'place.created',
              url: 'https://example.com/hook',
              active: true,
              created_at: '2026-04-17T00:00:00.000Z',
              last_triggered_at: null,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Test olayi gonderildi' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Webhook silindi' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    const { initWebhookManager } = await import('../webhook-manager');
    initWebhookManager();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('place.created');
    expect(loading.className).toBe('hidden');

    const testButton = content.querySelectorAll('[data-webhook-test]')[0];
    await testButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/api/webhooks/test', expect.objectContaining({ method: 'POST' }));
    expect(content.innerHTML).toContain('Test olayi gonderildi');

    const deleteButton = content.querySelectorAll('[data-webhook-delete]')[0];
    await deleteButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/api/webhooks/wh-1', { method: 'DELETE', credentials: 'same-origin' });
    expect(content.innerHTML).toContain('Henuz webhook tanimi bulunmuyor.');
  });
});
