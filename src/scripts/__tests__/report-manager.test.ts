import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  value?: string;
  listeners?: Record<string, Array<(event?: unknown) => void | Promise<void>>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: unknown) => void | Promise<void>) => void;
  click?: () => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset,
    value: '',
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: (event?: unknown) => void | Promise<void>) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

async function flushPromises() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function createReportRoot() {
  const loading = createInteractiveElement({});
  loading.className = 'p-4 text-center text-gray-500';

  let cachedHtml = '';
  let runButton: FakeElement | null = null;

  const content = createInteractiveElement({});
  content.className = 'hidden';
  content.querySelector = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      runButton = content.innerHTML.includes('data-report-manager-run') ? createInteractiveElement({}) : null;
    }
    if (selector === '[data-report-manager-run]') return runButton;
    return null;
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-report-manager-loading]') return loading;
    if (selector === '[data-report-manager-content]') return content;
    return null;
  };

  return { root, content, loading };
}

describe('report manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads reports and runs execute action', async () => {
    const { root, content, loading } = createReportRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
      createElement: () => ({ click() {} }),
    };

    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    URL.createObjectURL = (() => 'blob:test') as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

    const fetchMock = vi.fn(async (input: string, init?: { method?: string }) => {
      if (input === '/api/reports') {
        return {
          ok: true,
          json: async () => ({
            data: {
              success: true,
              data: [{ id: 'r1', name: 'Test', format: 'csv', is_active: true }],
            },
          }),
        };
      }
      if (input === '/api/reports/r1/execute' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ data: { success: true, message: 'Report executed' } }),
        };
      }
      throw new Error(`Unexpected fetch: ${input}`);
    });

    (globalThis as any).fetch = fetchMock;

    const { initReportManager } = await import('../report-manager');
    initReportManager();
    await flushPromises();

    expect(content.innerHTML).toContain('Test');
    expect(content.innerHTML).toContain('Download');
    expect(loading.className).toBe('hidden');

    const runButton = content.querySelector('[data-report-manager-run]');
    await runButton?.listeners?.click?.[0]?.();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reports/r1/execute',
      expect.objectContaining({ method: 'POST' }),
    );

    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });
});
