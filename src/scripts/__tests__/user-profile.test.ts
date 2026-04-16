import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  value?: string;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
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

function createUserProfileRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'loading';

  let cachedHtml = '';
  let tabs: FakeElement[] = [];
  let saveButton: FakeElement | null = null;
  let fullNameInput: FakeElement | null = null;

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-user-profile-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ userProfileTab: match[1] }),
      );
      saveButton = content.innerHTML.includes('data-user-profile-save')
        ? createInteractiveElement({})
        : null;
      fullNameInput = content.innerHTML.includes('data-user-profile-full-name')
        ? createInteractiveElement({}, 'Yeni Ad')
        : null;
    }

    if (selector === '[data-user-profile-save]') return saveButton;
    if (selector === '[data-user-profile-full-name]') return fullNameInput;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-user-profile-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ userProfileTab: match[1] }),
      );
      saveButton = content.innerHTML.includes('data-user-profile-save')
        ? createInteractiveElement({})
        : null;
      fullNameInput = content.innerHTML.includes('data-user-profile-full-name')
        ? createInteractiveElement({}, 'Yeni Ad')
        : null;
    }

    if (selector === '[data-user-profile-tab]') return tabs;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-user-profile-loading]') return loading;
    if (selector === '[data-user-profile-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('user profile script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads profile, switches to activity and saves profile name', async () => {
    const { root, loading, content } = createUserProfileRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      if (input === '/api/users/profile' && !init) {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                id: 'u1',
                email: 'test@example.com',
                full_name: 'Test Kullanıcı',
                role: 'user',
                created_at: '2026-04-17T00:00:00.000Z',
              },
            },
          }),
        };
      }

      if (input === '/api/activity') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: [
                {
                  id: 1,
                  userId: 'u1',
                  actionType: 'review_created',
                  metadata: { placeName: 'Göbeklitepe' },
                  createdAt: '2026-04-17T10:00:00.000Z',
                },
              ],
            },
          }),
        };
      }

      if (input === '/api/users/profile' && init?.method === 'PUT') {
        const body = JSON.parse(init.body || '{}');
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                id: 'u1',
                email: 'test@example.com',
                full_name: body.full_name,
                role: 'user',
                created_at: '2026-04-17T00:00:00.000Z',
              },
              message: 'Profil güncellendi',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initUserProfile } = await import('../user-profile');
    initUserProfile();
    await flushPromises();

    expect(content.innerHTML).toContain('Profilim');
    expect(content.innerHTML).toContain('Test Kullanıcı');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');

    const activityTab = content.querySelectorAll('[data-user-profile-tab]')[2];
    activityTab.listeners?.click?.[0]?.();
    await flushPromises();

    expect(content.innerHTML).toContain('Göbeklitepe');

    const profileTab = content.querySelectorAll('[data-user-profile-tab]')[0];
    profileTab.listeners?.click?.[0]?.();
    await flushPromises();
    const saveButton = content.querySelector('[data-user-profile-save]');
    await saveButton?.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/profile',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(content.innerHTML).toContain('Profil güncellendi');
  });
});
