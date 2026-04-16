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
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function createProfileRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'py-12 text-center text-gray-500';

  let cachedHtml = '';
  let followButton: FakeElement | null = null;

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      followButton = content.innerHTML.includes('data-user-public-profile-follow')
        ? createInteractiveElement({})
        : null;
    }
    if (selector === '[data-user-public-profile-follow]') return followButton;
    return null;
  };

  const root = createInteractiveElement({ userId: 'u1', currentUserId: 'u2' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-user-public-profile-loading]') return loading;
    if (selector === '[data-user-public-profile-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('user public profile script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads profile and triggers follow action', async () => {
    const { root, content, loading } = createProfileRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (input === '/api/users/u1/profile') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: {
                id: 'u1',
                full_name: 'Ali Veli',
                stats: { followers: 1, following: 2 },
                recent_activity: [],
              },
            },
          }),
        };
      }
      if (input === '/api/following/check?user_id=u1') {
        return { ok: true, json: async () => ({ data: { data: { is_following: false } } }) };
      }
      if (input === '/api/blocking/check?user_id=u1') {
        return { ok: true, json: async () => ({ data: { data: { blocked_user: false } } }) };
      }
      if (input === '/api/following' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ data: { success: true, message: 'Takip edildi' } }) };
      }
      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initUserPublicProfile } = await import('../user-public-profile');
    initUserPublicProfile();
    await flushPromises();

    expect(content.innerHTML).toContain('Ali Veli');
    expect(content.innerHTML).toContain('Takip Et');
    expect(loading.className).toBe('hidden');

    const followButton = content.querySelector('[data-user-public-profile-follow]');
    await followButton?.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/following',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
