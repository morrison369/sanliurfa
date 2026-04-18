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

function createInteractiveElement(dataset: Record<string, string> = {}, value = ''): FakeElement {
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

function createTransactionRoot() {
  const loading = createInteractiveElement();
  loading.className = 'space-y-3';

  let cachedHtml = '';
  let dateFromInput: FakeElement | null = null;
  let dateToInput: FakeElement | null = null;
  let exportButtons: FakeElement[] = [];

  const content = createInteractiveElement();
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      const dateFromMatch = content.innerHTML.match(/data-transaction-date-from[^>]*value="([^"]*)"/);
      const dateToMatch = content.innerHTML.match(/data-transaction-date-to[^>]*value="([^"]*)"/);
      dateFromInput = content.innerHTML.includes('data-transaction-date-from')
        ? createInteractiveElement({}, dateFromMatch?.[1] || '')
        : null;
      dateToInput = content.innerHTML.includes('data-transaction-date-to')
        ? createInteractiveElement({}, dateToMatch?.[1] || '')
        : null;
      exportButtons = Array.from(content.innerHTML.matchAll(/data-transaction-export/g)).map(() =>
        createInteractiveElement(),
      );
    }

    if (selector === '[data-transaction-date-from]') return dateFromInput;
    if (selector === '[data-transaction-date-to]') return dateToInput;
    return null;
  };
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      content.querySelector('[data-transaction-date-from]');
    }
    if (selector === '[data-transaction-export]') return exportButtons;
    return [];
  };

  const root = createInteractiveElement({ limit: '20', offset: '0', selectedType: '' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-transaction-loading]') return loading;
    if (selector === '[data-transaction-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('transaction history script', () => {
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

  it('renders transaction response and hides skeleton', async () => {
    const { root, loading, content } = createTransactionRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          success: true,
          data: {
            transactions: [
              {
                id: '1',
                transaction_type: 'earn',
                points_amount: 5,
                transaction_reason: 'Check-in',
                balance_before: 10,
                balance_after: 15,
                created_at: '2026-04-16T00:00:00.000Z',
                is_expired: false,
              },
            ],
            pagination: { limit: 20, offset: 0, total: 1 },
          },
        },
      }),
    });

    const { initTransactionHistory } = await import('../transaction-history');
    initTransactionHistory();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(content.innerHTML).toContain('Check-in');
    expect(content.innerHTML).toContain('data-transaction-type=""');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');
    expect(root.dataset.total).toBe('1');
  });

  it('restores selected type from local storage before fetching', async () => {
    const { root } = createTransactionRoot();
    (globalThis as any).window.localStorage.getItem.mockReturnValue('earn');

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          success: true,
          data: {
            transactions: [],
            pagination: { limit: 20, offset: 0, total: 0 },
          },
        },
      }),
    });
    (globalThis as any).fetch = fetchMock;

    const { initTransactionHistory } = await import('../transaction-history');
    initTransactionHistory();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.dataset.selectedType).toBe('earn');
    expect(fetchMock).toHaveBeenCalledWith('/api/loyalty/transactions?limit=20&offset=0&type=earn');
  });

  it('restores date range and exports current filtered view', async () => {
    const { root, content } = createTransactionRoot();
    const createObjectURL = vi.fn(() => 'blob:transactions');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    (globalThis as any).window.localStorage.getItem = vi.fn((key: string) => {
      if (key === 'sanliurfa:transaction-history:date-from') return '2026-04-01';
      if (key === 'sanliurfa:transaction-history:date-to') return '2026-04-30';
      return null;
    });
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
          data: {
            transactions: [
              {
                id: '1',
                transaction_type: 'earn',
                points_amount: 5,
                transaction_reason: 'Check-in',
                balance_before: 10,
                balance_after: 15,
                created_at: '2026-04-16T00:00:00.000Z',
                is_expired: false,
              },
            ],
            pagination: { limit: 20, offset: 0, total: 1 },
          },
        },
      }),
    });

    const { initTransactionHistory } = await import('../transaction-history');
    initTransactionHistory();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.dataset.dateFrom).toBe('2026-04-01');
    expect(root.dataset.dateTo).toBe('2026-04-30');

    const exportButton = content.querySelectorAll('[data-transaction-export]')[0];
    exportButton?.listeners?.click?.[0]?.();

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:transactions');
  });
});
