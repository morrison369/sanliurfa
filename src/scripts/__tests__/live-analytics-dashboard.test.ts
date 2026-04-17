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
    if (selector === '[data-live-analytics-loading]') return loading;
    if (selector === '[data-live-analytics-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('live analytics dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('connects to analytics SSE and renders metrics updates', async () => {
    const { root, loading, content } = createRoot();
    let metricsListener: ((payload: unknown) => void) | null = null;
    let kpiListener: ((payload: unknown) => void) | null = null;

    const connectToAnalytics = vi.fn();
    const onAnalyticsMetrics = vi.fn((callback: (payload: unknown) => void) => {
      metricsListener = callback;
      return vi.fn();
    });
    const onAnalyticsKPI = vi.fn((callback: (payload: unknown) => void) => {
      kpiListener = callback;
      return vi.fn();
    });

    vi.doMock('../../lib/realtime-sse', () => ({
      realtimeManager: {
        connectToAnalytics,
        onAnalyticsMetrics,
        onAnalyticsKPI,
      },
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      addEventListener: vi.fn(),
    };

    const { initLiveAnalyticsDashboard } = await import('../live-analytics-dashboard');
    initLiveAnalyticsDashboard();

    expect(connectToAnalytics).toHaveBeenCalled();
    expect(loading.className).toBe('flex items-center justify-center h-96');

    metricsListener?.({
      errorRate: 1.2,
      avgDuration: 140,
      p95Duration: 380,
      cacheHitRate: 82,
      slowRequests: 2,
      totalRequests: 2500,
      slowestEndpoints: [{ endpoint: '/api/realtime/analytics', count: 4, avgDuration: 610 }],
      dbPool: { active: 3, idle: 7, waiting: 0, utilization: 30 },
    });
    kpiListener?.({
      alertCount: 1,
      kpis: [{ name: 'Aktif Kullanıcı', description: 'Canlı kullanıcılar' }],
    });

    expect(content.innerHTML).toContain('Canlı Analitik Gösterge Paneli');
    expect(content.innerHTML).toContain('Aktif Kullanıcı');
    expect(content.innerHTML).toContain('/api/realtime/analytics');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
  });
});
