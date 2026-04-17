import { describe, expect, it } from 'vitest';

import {
  extractBusinessAnalyticsData,
  extractBusinessInsights,
  renderBusinessAnalyticsDashboard,
} from '../business-analytics-dashboard';

describe('business analytics dashboard helpers', () => {
  it('extracts nested analytics payload', () => {
    const data = extractBusinessAnalyticsData({
      success: true,
      data: {
        success: true,
        data: {
          analytics: {
            totalVisitors: 1200,
            avgRating: 4.6,
            reviewCount: 40,
            followerCount: 85,
          },
          metrics: [{ date: '2026-04-01', view_count: 50, review_count: 2, average_rating: 4.5, new_followers: 1 }],
        },
      },
    });

    expect(data?.analytics.totalVisitors).toBe(1200);
    expect(data?.metrics).toHaveLength(1);
  });

  it('extracts nested insights payload', () => {
    const insights = extractBusinessInsights({
      success: true,
      data: {
        success: true,
        data: [{ id: 'i1', title: 'Yoğun Saat', description: 'Açıklama', priority: 'high', action_recommendation: 'Öneri', estimated_impact: 'Yüksek' }],
      },
    });

    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe('Yoğun Saat');
  });

  it('renders dashboard content', () => {
    const html = renderBusinessAnalyticsDashboard({
      placeId: 'place-1',
      days: 30,
      data: {
        analytics: {
          totalVisitors: 1200,
          avgRating: 4.6,
          reviewCount: 40,
          followerCount: 85,
        },
        metrics: [{ date: '2026-04-01', view_count: 50, review_count: 2, average_rating: 4.5, new_followers: 1 }],
      },
      insights: [{ id: 'i1', title: 'Yoğun Saat', description: 'Açıklama', priority: 'high', action_recommendation: 'Öneri', estimated_impact: 'Yüksek' }],
      error: null,
    });

    expect(html).toContain('Toplam ziyaretçi');
    expect(html).toContain('30 gün');
    expect(html).toContain('AI önerileri');
  });
});
