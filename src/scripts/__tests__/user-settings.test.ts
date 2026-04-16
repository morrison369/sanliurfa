import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  value?: string;
  checked?: boolean;
  type?: string;
  listeners?: Record<string, Array<(event?: { currentTarget: FakeElement; preventDefault?: () => void }) => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: { currentTarget: FakeElement; preventDefault?: () => void }) => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value = ''): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset,
    value,
    checked: false,
    type: 'text',
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
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

function createUserSettingsRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'loading';

  let cachedHtml = '';
  let tabs: FakeElement[] = [];
  let resendButton: FakeElement | null = null;
  let settingsForm: FakeElement | null = null;
  let themeSelect: FakeElement | null = null;
  let securityTab: FakeElement | null = null;
  let setupButton: FakeElement | null = null;

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-user-settings-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ userSettingsTab: match[1] }),
      );
      resendButton = content.innerHTML.includes('data-user-settings-resend-verification')
        ? createInteractiveElement({})
        : null;
      settingsForm = content.innerHTML.includes('data-user-settings-settings-form')
        ? createInteractiveElement({})
        : null;
      themeSelect = content.innerHTML.includes('data-user-settings-field="theme_preference"')
        ? createInteractiveElement({ userSettingsField: 'theme_preference' }, 'dark')
        : null;
      securityTab = tabs.find((item) => item.dataset.userSettingsTab === 'security') ?? null;
      setupButton = content.innerHTML.includes('data-user-settings-2fa-start')
        ? createInteractiveElement({})
        : null;
    }

    if (selector === '[data-user-settings-resend-verification]') return resendButton;
    if (selector === '[data-user-settings-settings-form]') return settingsForm;
    if (selector === '[data-user-settings-field="theme_preference"]') return themeSelect;
    if (selector === '[data-user-settings-2fa-start]') return setupButton;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-user-settings-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ userSettingsTab: match[1] }),
      );
      resendButton = content.innerHTML.includes('data-user-settings-resend-verification')
        ? createInteractiveElement({})
        : null;
      settingsForm = content.innerHTML.includes('data-user-settings-settings-form')
        ? createInteractiveElement({})
        : null;
      themeSelect = content.innerHTML.includes('data-user-settings-field="theme_preference"')
        ? createInteractiveElement({ userSettingsField: 'theme_preference' }, 'dark')
        : null;
      securityTab = tabs.find((item) => item.dataset.userSettingsTab === 'security') ?? null;
      setupButton = content.innerHTML.includes('data-user-settings-2fa-start')
        ? createInteractiveElement({})
        : null;
    }

    if (selector === '[data-user-settings-tab]') return tabs;
    if (selector === '[data-user-settings-field]') return themeSelect ? [themeSelect] : [];
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-user-settings-loading]') return loading;
    if (selector === '[data-user-settings-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('user-settings script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads profile, saves settings and loads 2fa status', async () => {
    const { root, loading, content } = createUserSettingsRoot();
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
                username: 'test',
                avatar_url: '',
                bio: '',
                language_preference: 'tr',
                theme_preference: 'light',
                email_verified: false,
                notification_preferences: { email: true, push: true, in_app: true, digest: 'weekly' },
                privacy_settings: { profile_public: true, show_email: false, allow_messages: true },
                two_factor_enabled: false,
              },
            },
          }),
        };
      }

      if (input === '/api/users/settings' && init?.method === 'PUT') {
        const body = JSON.parse(init.body || '{}');
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              message: 'Ayarlar güncellendi',
              data: {
                language_preference: 'tr',
                theme_preference: body.theme_preference,
                notification_preferences: body.notification_preferences,
              },
            },
          }),
        };
      }

      if (input === '/api/users/2fa/status') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            twoFactorEnabled: false,
            backupCodesRemaining: 0,
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initUserSettings } = await import('../user-settings');
    initUserSettings();
    await flushPromises();

    expect(content.innerHTML).toContain('Hesabınızın güvenliği için e-posta adresinizi doğrulayın');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');

    const settingsTab = content.querySelectorAll('[data-user-settings-tab]')[1];
    settingsTab.listeners?.click?.[0]?.();
    await flushPromises();

    const themeSelect = content.querySelector('[data-user-settings-field="theme_preference"]');
    themeSelect!.value = 'dark';
    themeSelect!.listeners?.change?.[0]?.({ currentTarget: themeSelect! });
    const settingsForm = content.querySelector('[data-user-settings-settings-form]');
    settingsForm?.listeners?.submit?.[0]?.({ currentTarget: settingsForm, preventDefault: () => undefined });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/settings',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(content.innerHTML).toContain('Ayarlar başarıyla güncellendi');

    const securityTab = content.querySelectorAll('[data-user-settings-tab]')[4];
    securityTab.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith('/api/users/2fa/status', undefined);
    expect(content.innerHTML).toContain('İki Faktörlü Kimlik Doğrulama');
  });
});
