import { describe, expect, it } from 'vitest';

import { extractAnalyticsPanelData, renderAnalyticsPanel } from '../analytics-panel';

describe('analytics panel helpers', () => {
  it('extracts nested analytics payload', () => {
    const data = extractAnalyticsPanelData({
      success: true,
      data: {
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
      },
    });

    expect(data?.period).toBe(30);
    expect(data?.platformStats.uniqueUsers).toBe(140);
    expect(data?.trendingPlaces).toHaveLength(1);
  });

  it('renders analytics panel content', () => {
    const html = renderAnalyticsPanel({
      days: 30,
      error: null,
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
    });

    expect(html).toContain('Aktif kullanıcı');
    expect(html).toContain('Göbeklitepe');
    expect(html).toContain('Popüler aramalar');
    expect(html).toContain('30 gün');
  });
});
