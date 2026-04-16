import { describe, expect, it } from 'vitest';

import {
  extractAdminAnalyticsDashboardData,
  renderAdminAnalyticsDashboard,
} from '../admin-analytics-dashboard';

describe('admin analytics dashboard helpers', () => {
  it('extracts nested admin analytics payload', () => {
    const data = extractAdminAnalyticsDashboardData({
      success: true,
      data: {
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
      },
    });

    expect(data?.platformStats.uniqueUsers).toBe(95);
    expect(data?.searchTrends[0]?.query).toBe('urfa kebap');
  });

  it('renders admin analytics dashboard content', () => {
    const html = renderAdminAnalyticsDashboard({
      days: 30,
      error: null,
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
    });

    expect(html).toContain('Aktif Kullanıcı');
    expect(html).toContain('urfa kebap');
    expect(html).toContain('Trend Olan Mekanlar');
  });
});
