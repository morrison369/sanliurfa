import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  checked?: boolean;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>, checked = false): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    checked,
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

function createRoot() {
  let cachedHtml = '';
  let dimensionInputs: FakeElement[] = [];
  let measureInputs: FakeElement[] = [];
  let runButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      dimensionInputs = Array.from(content.innerHTML.matchAll(/data-olap-dimension="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ olapDimension: match[1] }),
      );
      measureInputs = Array.from(content.innerHTML.matchAll(/data-olap-measure="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ olapMeasure: match[1] }),
      );
      runButtons = content.innerHTML.includes('data-olap-run-query')
        ? [createInteractiveElement({})]
        : [];
    }

    if (selector === '[data-olap-dimension]') return dimensionInputs;
    if (selector === '[data-olap-measure]') return measureInputs;
    return [];
  };
  content.querySelector = (selector: string) => {
    if (selector === '[data-olap-run-query]') return runButtons[0] ?? null;
    return null;
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-olap-explorer-loading]') return loading;
    if (selector === '[data-olap-explorer-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('olap explorer script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads dimensions, toggles selections and runs query', async () => {
    const { root, loading, content } = createRoot();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            dimensions: [{ name: 'city', label: 'Şehir', levels: ['city'] }],
            measures: [{ name: 'views', label: 'Görüntülenme', type: 'sum' }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            rows: [{ city: 'Şanlıurfa', views: 120 }],
            cached: true,
          },
        }),
      });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initOlapExplorer } = await import('../olap-explorer');
    initOlapExplorer();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Şehir');
    expect(loading.className).toBe('hidden');

    const dimension = content.querySelectorAll('[data-olap-dimension]')[0];
    const measure = content.querySelectorAll('[data-olap-measure]')[0];
    dimension.listeners?.change?.[0]?.();
    measure.listeners?.change?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const runButton = content.querySelector('[data-olap-run-query]');
    runButton?.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/api/warehouse/dimensions', { credentials: 'same-origin' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/warehouse/query',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(content.innerHTML).toContain('Şanlıurfa');
  });
});
