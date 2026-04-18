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

function createInteractiveElement(dataset: Record<string, string> = {}): FakeElement {
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

function createBillingRoot() {
  const loading = createInteractiveElement();
  loading.className = 'space-y-3';

  let cachedHtml = '';
  let statusButtons: FakeElement[] = [];
  let exportButtons: FakeElement[] = [];

  const content = createInteractiveElement();
  content.className = 'hidden';
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      statusButtons = Array.from(content.innerHTML.matchAll(/data-billing-status="([^"]*)"/g)).map((match) =>
        createInteractiveElement({ billingStatus: match[1] }),
      );
      exportButtons = Array.from(content.innerHTML.matchAll(/data-billing-export/g)).map(() =>
        createInteractiveElement(),
      );
    }

    if (selector === '[data-billing-status]') return statusButtons;
    if (selector === '[data-billing-export]') return exportButtons;
    return [];
  };

  const root = createInteractiveElement();
  root.querySelector = (selector: string) => {
    if (selector === '[data-billing-loading]') return loading;
    if (selector === '[data-billing-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('billing history script', () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
      },
    };
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

  it('restores selected status from local storage', async () => {
    const { root, content } = createBillingRoot();
    (globalThis as any).window.localStorage.getItem.mockReturnValue('paid');

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
            {
              id: 'billing-2',
              subscriptionId: 'sub-1',
              amount: 99,
              currency: 'TRY',
              billingCycle: 'monthly',
              status: 'failed',
              createdAt: '2026-04-15T00:00:00.000Z',
            },
          ],
        },
      }),
    });

    const { initBillingHistory } = await import('../billing-history');
    initBillingHistory();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.dataset.selectedStatus).toBe('paid');
    expect(content.innerHTML).toContain('data-billing-status="paid"');
    expect(content.innerHTML).toContain('₺199.00');
    expect(content.innerHTML).not.toContain('₺99.00');
  });

  it('exports current filtered billing view', async () => {
    const { root, content } = createBillingRoot();
    const createObjectURL = vi.fn(() => 'blob:billing');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    (globalThis as any).window.localStorage.getItem.mockReturnValue('paid');
    (globalThis as any).window.URL = {
      createObjectURL,
      revokeObjectURL,
    };
    (globalThis as any).document = {
      querySelectorAll: () => [root],
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click,
      })),
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
              invoiceNumber: 'INV-100',
              paymentMethod: 'Visa •••• 4242',
              status: 'paid',
              createdAt: '2026-04-16T00:00:00.000Z',
            },
            {
              id: 'billing-2',
              subscriptionId: 'sub-1',
              amount: 99,
              currency: 'TRY',
              billingCycle: 'monthly',
              status: 'failed',
              createdAt: '2026-04-15T00:00:00.000Z',
            },
          ],
        },
      }),
    });

    const { initBillingHistory } = await import('../billing-history');
    initBillingHistory();
    await Promise.resolve();
    await Promise.resolve();

    const exportButton = content.querySelectorAll('[data-billing-export]')[0];
    exportButton?.listeners?.click?.[0]?.();

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:billing');
  });
});
