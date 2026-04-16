import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  querySelector: (selector: string) => FakeElement | null;
};

function createActivityRoot() {
  const loading: FakeElement = {
    textContent: '',
    className: 'py-8 text-center text-gray-600',
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
      if (selector === '[data-activity-loading]') return loading;
      if (selector === '[data-activity-content]') return content;
      return null;
    },
  };

  return { root, loading, content };
}

describe('my activity log script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads activity response and hides loading', async () => {
    const { root, loading, content } = createActivityRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          success: true,
          data: [
            {
              id: 1,
              actionType: 'review_created',
              metadata: { placeName: 'Balıklıgöl' },
              createdAt: '2026-04-17T00:00:00.000Z',
            },
          ],
        },
      }),
    });

    const { initMyActivityLog } = await import('../my-activity-log');
    initMyActivityLog();
    await Promise.resolve();
    await Promise.resolve();

    expect(content.innerHTML).toContain('İnceleme yazdın');
    expect(content.innerHTML).toContain('Balıklıgöl');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(root.dataset.initialized).toBe('true');
  });
});
