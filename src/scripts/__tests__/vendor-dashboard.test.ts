import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
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

function createVendorRoot() {
  let cachedHtml = '';
  let tabs: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabs = Array.from(content.innerHTML.matchAll(/data-vendor-dashboard-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ vendorDashboardTab: match[1] }),
      );
    }
    if (selector === '[data-vendor-dashboard-tab]') return tabs;
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
  });

  it('renders and switches tabs', async () => {
    const { root, content } = createVendorRoot();
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initVendorDashboard } = await import('../vendor-dashboard');
    initVendorDashboard();

    expect(content.innerHTML).toContain('Toplam Görüntüleme');

    const reviewsTab = content.querySelectorAll('[data-vendor-dashboard-tab]')[2];
    reviewsTab.listeners?.click?.[0]?.();

    expect(content.innerHTML).toContain('Muhteşem hizmet!');
  });
});
