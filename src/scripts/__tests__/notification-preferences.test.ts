import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  value?: string;
  checked?: boolean;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>, extra?: Partial<FakeElement>): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset,
    value: '',
    checked: false,
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: () => void) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
    ...extra,
  };
}

async function flushPromises() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

function createPreferencesRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'space-y-4';

  let cachedHtml = '';
  let toggles: FakeElement[] = [];
  let frequencies: FakeElement[] = [];
  let saveButtons: FakeElement[] = [];

  const content: FakeElement = createInteractiveElement({}, {
    className: 'hidden',
    querySelectorAll: (selector: string) => {
      if (cachedHtml !== content.innerHTML) {
        cachedHtml = content.innerHTML;
        toggles = Array.from(content.innerHTML.matchAll(/data-pref-toggle="([^"]+)"([^>]*)/g)).map((match) =>
          createInteractiveElement(
            { prefToggle: match[1] },
            { checked: /checked/.test(match[2] ?? '') },
          ),
        );
        frequencies = Array.from(content.innerHTML.matchAll(/data-pref-frequency="([^"]+)"/g)).map((match) =>
          createInteractiveElement({ prefFrequency: match[1] }, { value: 'immediate' }),
        );
        saveButtons = Array.from(content.innerHTML.matchAll(/data-pref-save="([^"]+)"/g)).map((match) =>
          createInteractiveElement({ prefSave: match[1] }),
        );
      }

      if (selector === '[data-pref-toggle]') return toggles;
      if (selector === '[data-pref-frequency]') return frequencies;
      if (selector === '[data-pref-save]') return saveButtons;
      return [];
    },
  });

  const root: FakeElement = createInteractiveElement({}, {
    querySelector: (selector: string) => {
      if (selector === '[data-preferences-loading]') return loading;
      if (selector === '[data-preferences-content]') return content;
      return null;
    },
  });

  return { root, loading, content };
}

describe('notification preferences script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads preferences and saves updated settings', async () => {
    const { root, loading, content } = createPreferencesRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (typeof input === 'string' && input.startsWith('/api/notifications/preferences?type=')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                preferences: {
                  inAppEnabled: true,
                  pushEnabled: true,
                  emailEnabled: false,
                  frequency: 'daily',
                },
              },
            },
          }),
        };
      }

      if (input === '/api/notifications/preferences' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              message: 'Tercihler güncellendi',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initNotificationPreferences } = await import('../notification-preferences');
    initNotificationPreferences();
    await flushPromises();

    expect(content.innerHTML).toContain('Bildirim Tercihleri');
    expect(content.innerHTML).toContain('Yeni Mesajlar');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');

    const saveButton = content.querySelectorAll('[data-pref-save]')[0];
    await saveButton.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/preferences',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(content.innerHTML).toContain('Tercihler güncellendi');
  });
});
