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

function createBusinessRoot() {
  let cachedHtml = '';
  let dayButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      dayButtons = Array.from(
        content.innerHTML.matchAll(/data-business-analytics-days="([^"]+)"/g),
      ).map((match) => createInteractiveElement({ businessAnalyticsDays: match[1] }));
    }

    if (selector === '[data-business-analytics-days]') return dayButtons;
    if (selector === '[data-business-analytics-acknowledge]') return [];
    return [];
  };

  const root = createInteractiveElement({ placeId: 'place-1', days: '30' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-business-analytics-loading]') return loading;
    if (selector === '[data-business-analytics-content]') return content;
    return null;
  };

  return { root, content, loading };
}

describe('business analytics dashboard script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders analytics data and refreshes on day change', async () => {
    const { root, content, loading } = createBusinessRoot();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            data: {
              analytics: {
                totalVisitors: 500,
                avgRating: 4.2,
                reviewCount: 12,
                followerCount: 8,
              },
              metrics: [{ date: '2026-04-01', view_count: 25, review_count: 2, average_rating: 4.2, new_followers: 1 }],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            data: [{ id: 'i1', title: 'Yoğun Saat', description: 'Açıklama', priority: 'medium', action_recommendation: 'Öneri', estimated_impact: 'Orta' }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            data: {
              analytics: {
                totalVisitors: 700,
                avgRating: 4.4,
                reviewCount: 20,
                followerCount: 11,
              },
              metrics: [{ date: '2026-04-01', view_count: 40, review_count: 3, average_rating: 4.4, new_followers: 2 }],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            data: [],
          },
        }),
      });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).window = { location: { search: '' } };
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initBusinessAnalyticsDashboard } = await import('../business-analytics-dashboard');
    initBusinessAnalyticsDashboard();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Toplam Ziyaretçi');
    expect(content.innerHTML).toContain('AI Önerileri');
    expect(loading.className).toBe('hidden');

    const dayButton = content.querySelectorAll('[data-business-analytics-days]')[0];
    dayButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/api/business/analytics?placeId=place-1&days=7');
    expect(content.innerHTML).toContain('700');
  });
});
