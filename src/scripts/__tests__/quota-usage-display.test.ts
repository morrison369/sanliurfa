import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  querySelector: (selector: string) => FakeElement | null;
};

function createQuotaRoot(compact = false) {
  const loading: FakeElement = {
    textContent: '',
    className: '',
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
    dataset: { compact: compact ? 'true' : 'false' },
    querySelector: (selector: string) => {
      if (selector === '[data-quota-loading]') return loading;
      if (selector === '[data-quota-content]') return content;
      return null;
    },
  };

  return { root, loading, content };
}

describe('quota usage display script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders quota response and hides skeleton', async () => {
    const { root, loading, content } = createQuotaRoot(false);

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        tier: { name: 'Premium', level: 2 },
        quotas: [
          {
            feature: 'Mesaj',
            current: 5,
            limit: 10,
            remaining: 5,
            percentageUsed: 50,
            resetDate: '2026-04-16T00:00:00.000Z',
            message: '5 hakkınız kaldı',
          },
        ],
        summary: { totalQuotas: 1, limitedQuotas: 1, unlimitedQuotas: 0 },
      }),
    });

    const { initQuotaUsageDisplays } = await import('../quota-usage-display');
    initQuotaUsageDisplays();
    await Promise.resolve();
    await Promise.resolve();

    expect(content.innerHTML).toContain('Kullanım Kotaları');
    expect(content.innerHTML).toContain('Mesaj');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');
  });
});
