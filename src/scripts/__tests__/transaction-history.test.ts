import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
};

function createTransactionRoot() {
  const loading: FakeElement = {
    textContent: '',
    className: 'space-y-3',
    innerHTML: '',
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const content: FakeElement = {
    textContent: '',
    className: 'hidden',
    innerHTML: '',
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const root: FakeElement = {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: { limit: '20', offset: '0', selectedType: '' },
    querySelector: (selector: string) => {
      if (selector === '[data-transaction-loading]') return loading;
      if (selector === '[data-transaction-content]') return content;
      return null;
    },
    querySelectorAll: () => [],
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
});
