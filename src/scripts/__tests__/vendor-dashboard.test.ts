import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  listeners?: Record<string, Array<(event?: { preventDefault: () => void }) => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: { preventDefault: () => void }) => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
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

function createVendorRoot() {
  let cachedHtml = '';
  let tabs: FakeElement[] = [];
  let shortcuts: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-vendor-dashboard-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ vendorDashboardTab: match[1] }),
      );
      shortcuts = Array.from(
        content.innerHTML.matchAll(/data-vendor-dashboard-shortcut="([^"]+)"/g),
      ).map((match) => createInteractiveElement({ vendorDashboardShortcut: match[1] }));
    }
    if (selector === '[data-vendor-dashboard-tab]') return tabs;
    if (selector === '[data-vendor-dashboard-shortcut]') return shortcuts;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-vendor-dashboard-content]') return content;
    return null;
  };

  return { root, content };
}

describe('vendor dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      },
    };
  });

  it('renders and switches tabs', async () => {
    const { root, content } = createVendorRoot();
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initVendorDashboard } = await import('../vendor-dashboard');
    initVendorDashboard();

    expect(content.innerHTML).toContain('Toplam görüntüleme');

    const reviewsTab = content.querySelectorAll('[data-vendor-dashboard-tab]')[2];
    reviewsTab.listeners?.click?.[0]?.();

    expect(content.innerHTML).toContain('Muhteşem hizmet!');
  });

  it('restores stored tab and supports shortcut navigation', async () => {
    const { root, content } = createVendorRoot();
    (globalThis as any).window.localStorage.getItem.mockReturnValue('overview');
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initVendorDashboard } = await import('../vendor-dashboard');
    initVendorDashboard();

    expect(root.dataset.activeTab).toBe('overview');
    expect(content.innerHTML).toContain('Hızlı aksiyonlar');

    const shortcut = content.querySelectorAll('[data-vendor-dashboard-shortcut]')[0];
    shortcut.listeners?.click?.[0]?.({ preventDefault: vi.fn() });

    expect(root.dataset.activeTab).toBe('listings');
    expect(content.innerHTML).toContain('Henüz eklenmiş işletme bulunmuyor.');
    expect((globalThis as any).window.localStorage.setItem).toHaveBeenCalledWith(
      'sanliurfa:vendor-dashboard:active-tab',
      'listings',
    );
  });
});
