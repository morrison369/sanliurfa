import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
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

function createAdminManagerRoot() {
  let cachedHtml = '';
  let tabButtons: FakeElement[] = [];

  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabButtons = Array.from(content.innerHTML.matchAll(/data-admin-manager-tab="([^"]+)"/g)).map((match) =>
        createInteractiveElement({ adminManagerTab: match[1] }),
      );
    }

    if (selector === '[data-admin-manager-tab]') return tabButtons;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-admin-manager-content]') return content;
    return null;
  };

  return { root, content };
}

describe('admin manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders and switches tabs', async () => {
    const { root, content } = createAdminManagerRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAdminManager } = await import('../admin-manager');
    initAdminManager();

    expect(content.innerHTML).toContain('Yer adı ara...');

    const reviewsButton = content.querySelectorAll('[data-admin-manager-tab]')[1];
    reviewsButton.listeners?.click?.[0]?.();

    expect(content.innerHTML).toContain('Yorum ara...');
    expect(content.innerHTML).toContain('Onaylandı');
  });
});
