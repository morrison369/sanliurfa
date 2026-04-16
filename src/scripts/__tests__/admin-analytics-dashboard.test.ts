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

function createAnalyticsRoot() {
  let cachedHtml = '';
  let dayButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      dayButtons = Array.from(content.innerHTML.matchAll(/data-analytics-panel-days="([^"]+)"/g)).map(
        (match) => createInteractiveElement({ analyticsPanelDays: match[1] }),
      );
    }

    if (selector === '[data-analytics-panel-days]') return dayButtons;
    return [];
  };

  const root = createInteractiveElement({ days: '30' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-admin-analytics-loading]') return loading;
    if (selector === '[data-admin-analytics-content]') return content;
    return null;
  };

  return { root, content, loading };
}

describe('admin analytics dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders analytics dashboard and refreshes on day change', async () => {
    const { root, content, loading } = createAnalyticsRoot();

    const fetchAdminAnalytics = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          period: 30,
          platformStats: {
            avgSessionDuration: 52,
            period: 30,
            totalConversions: 11,
            totalSessions: 220,
            totalTimeSpent: 6400,
            uniquePages: 41,
            uniqueSearches: 70,
            uniqueUsers: 95,
          },
          trendingPlaces: [],
          searchTrends: [{ avgResults: 4, count: 10, query: 'urfa kebap' }],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          period: 7,
          platformStats: {
            avgSessionDuration: 31,
            period: 7,
            totalConversions: 4,
            totalSessions: 80,
            totalTimeSpent: 2200,
            uniquePages: 18,
            uniqueSearches: 22,
            uniqueUsers: 44,
          },
          trendingPlaces: [],
          searchTrends: [{ avgResults: 5, count: 6, query: 'balikli gol' }],
        },
      });

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminAnalytics,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAdminAnalyticsDashboard } = await import('../admin-analytics-dashboard');
    initAdminAnalyticsDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('urfa kebap');
    expect(content.innerHTML).toContain('Aktif Kullanıcı');
    expect(loading.className).toBe('hidden');

    const button = content.querySelectorAll('[data-analytics-panel-days]')[0];
    button.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchAdminAnalytics).toHaveBeenCalledWith(30, 10);
    expect(fetchAdminAnalytics).toHaveBeenCalledWith(7, 10);
    expect(content.innerHTML).toContain('balikli gol');
  });
});
