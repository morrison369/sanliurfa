import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  querySelector: (selector: string) => FakeElement | null;
};

function createBillingRoot() {
  const loading: FakeElement = {
    textContent: '',
    className: 'space-y-3',
    innerHTML: '',
    dataset: {},
    querySelector: () => null,
  };

  const content: FakeElement = {
    textContent: '',
    className: 'hidden',
    innerHTML: '',
    dataset: {},
    querySelector: () => null,
  };

  const root: FakeElement = {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: {},
    querySelector: (selector: string) => {
      if (selector === '[data-billing-loading]') return loading;
      if (selector === '[data-billing-content]') return content;
      return null;
    },
  };

  return { root, loading, content };
}

describe('billing history script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders billing response and hides skeleton', async () => {
    const { root, loading, content } = createBillingRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          success: true,
          billing: [
            {
              id: 'billing-1',
              subscriptionId: 'sub-1',
              amount: 199,
              currency: 'TRY',
              billingCycle: 'monthly',
              status: 'paid',
              createdAt: '2026-04-16T00:00:00.000Z',
            },
          ],
        },
      }),
    });

    const { initBillingHistory } = await import('../billing-history');
    initBillingHistory();
    await Promise.resolve();
    await Promise.resolve();

    expect(content.innerHTML).toContain('₺199.00');
    expect(content.innerHTML).toContain('Ödendi');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');
  });
});
