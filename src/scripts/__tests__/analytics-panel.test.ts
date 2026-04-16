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
    if (selector === '[data-analytics-panel-loading]') return loading;
    if (selector === '[data-analytics-panel-content]') return content;
    return null;
  };

  return { root, content, loading };
}

describe('analytics panel script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders analytics panel and refreshes on day change', async () => {
    const { root, content, loading } = createAnalyticsRoot();

    const fetchAdminAnalytics = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          period: 30,
          platformStats: {
            avgSessionDuration: 42,
            period: 30,
            totalConversions: 14,
            totalSessions: 320,
            totalTimeSpent: 7200,
            uniquePages: 55,
            uniqueSearches: 81,
            uniqueUsers: 140,
          },
          trendingPlaces: [
            {
              avgRating: 4.8,
              category: 'Tarihi',
              id: 'place-1',
              name: 'Göbeklitepe',
              reviewCount: 120,
              totalClicks: 15,
              totalLikes: 42,
              totalShares: 8,
              totalViews: 560,
            },
          ],
          searchTrends: [{ avgResults: 6, count: 24, query: 'gobeklitepe' }],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          period: 7,
          platformStats: {
            avgSessionDuration: 38,
            period: 7,
            totalConversions: 6,
            totalSessions: 140,
            totalTimeSpent: 3600,
            uniquePages: 23,
            uniqueSearches: 41,
            uniqueUsers: 72,
          },
          trendingPlaces: [],
          searchTrends: [{ avgResults: 4, count: 12, query: 'balikli gol' }],
        },
      });

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminAnalytics,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initAnalyticsPanel } = await import('../analytics-panel');
    initAnalyticsPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Göbeklitepe');
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
