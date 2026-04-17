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

function createPerformanceRoot() {
  let cachedHtml = '';
  let tabButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      tabButtons = Array.from(content.innerHTML.matchAll(/data-admin-performance-tab="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ adminPerformanceTab: match[1] }),
      );
    }

    if (selector === '[data-admin-performance-tab]') return tabButtons;
    return [];
  };

  const root = createInteractiveElement({});
  root.querySelector = (selector: string) => {
    if (selector === '[data-admin-performance-loading]') return loading;
    if (selector === '[data-admin-performance-content]') return content;
    return null;
  };

  return { root, content, loading };
}

describe('admin performance dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders optimization payload and switches tabs', async () => {
    const { root, content, loading } = createPerformanceRoot();

    const fetchAdminPerformanceOptimization = vi.fn().mockResolvedValue({
      recommendations: [{ priority: 'high', title: 'Optimize', description: 'Slow query', action: 'Add index' }],
      metrics: {
        slowQueriesCount: 4,
        slowRequestRate: 12.4,
        cacheHitRate: 61.2,
        avgRequestDuration: 182,
        p95Duration: 410,
      },
      cacheStrategies: { strategies: ['page'], strategiesCount: 1 },
      indexSuggestions: [{ table: 'reviews', reason: 'created_at filter' }],
      artifactHealth: {
        releaseGate: { status: 'healthy', generatedAt: '2026-04-17T08:00:00.000Z' },
      },
      artifactHealthSummary: {
        overall: 'healthy',
        healthyCount: 1,
        degradedCount: 0,
        blockedCount: 0,
        total: 1,
      },
      slowOperations: [{ type: 'api', message: '/api/admin', duration: 880, timestamp: '2026-04-17T08:12:00.000Z' }],
      timestamp: '2026-04-17T08:10:00.000Z',
    });

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminPerformanceOptimization,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAdminPerformanceDashboard } = await import('../admin-performance-dashboard');
    initAdminPerformanceDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchAdminPerformanceOptimization).toHaveBeenCalledTimes(1);
    expect(content.innerHTML).toContain('Yavas sorgu');
    expect(content.innerHTML).toContain('Index Onerileri');
    expect(loading.className).toBe('hidden');

    const artifactsButton = content
      .querySelectorAll('[data-admin-performance-tab]')
      .find((button) => button.dataset.adminPerformanceTab === 'artifacts');
    artifactsButton?.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Genel Durum');
    expect(content.innerHTML).toContain('releaseGate');
    expect(fetchAdminPerformanceOptimization).toHaveBeenCalledTimes(1);
  });
});
