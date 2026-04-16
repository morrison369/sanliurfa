import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
};

function createElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function createRoot() {
  const loading = createElement({});
  const content = createElement({});
  const root = createElement({});

  root.querySelector = (selector: string) => {
    if (selector === '[data-admin-loyalty-loading]') return loading;
    if (selector === '[data-admin-loyalty-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('admin loyalty panel script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders loyalty rewards table', async () => {
    const { root, loading, content } = createRoot();

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminLoyaltyRewards: vi.fn().mockResolvedValue({
        data: [{ id: 'r1', reward_name: 'Ücretsiz Kahve', category: 'İçecek', points_cost: 250 }],
      }),
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAdminLoyaltyPanel } = await import('../admin-loyalty-panel');
    initAdminLoyaltyPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Ücretsiz Kahve');
    expect(content.innerHTML).toContain('Ödüller');
    expect(loading.className).toBe('hidden');
  });
});
