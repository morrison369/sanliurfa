import { describe, expect, it } from 'vitest';

import {
  extractWebhookAnalyticsMetrics,
  normalizeWebhookAnalyticsTab,
  renderWebhookAnalyticsDashboard,
} from '../webhook-analytics-dashboard';

describe('webhook analytics dashboard helpers', () => {
  it('extracts nested webhook analytics payload', () => {
    const metrics = extractWebhookAnalyticsMetrics({
      success: true,
      data: {
        success: true,
        data: {
          totalWebhooks: 3,
          totalEvents: 50,
          deliveredEvents: 44,
          failedEvents: 4,
          pendingEvents: 2,
          successRate: 88,
          avgDeliveryTime: 120,
          byEvent: {
            'place.created': { total: 10, delivered: 9, failed: 1, pending: 0, successRate: 90 },
          },
          lastHourActivity: [{ time: '2026-04-17T00:00:00.000Z', sent: 3, delivered: 2, failed: 1 }],
          topFailedEvents: [{ event: 'place.created', failedCount: 2, attempts: 5 }],
        },
      },
    });

    expect(metrics?.totalWebhooks).toBe(3);
    expect(metrics?.byEvent['place.created']?.successRate).toBe(90);
  });

  it('normalizes tabs', () => {
    expect(normalizeWebhookAnalyticsTab('events')).toBe('events');
    expect(normalizeWebhookAnalyticsTab('failed')).toBe('failed');
    expect(normalizeWebhookAnalyticsTab('bad')).toBe('overview');
  });

  it('renders events tab', () => {
    const html = renderWebhookAnalyticsDashboard({
      activeTab: 'events',
      error: null,
      metrics: {
        totalWebhooks: 3,
        totalEvents: 50,
        deliveredEvents: 44,
        failedEvents: 4,
        pendingEvents: 2,
        successRate: 88,
        avgDeliveryTime: 120,
        byEvent: {
          'place.created': { total: 10, delivered: 9, failed: 1, pending: 0, successRate: 90 },
        },
        lastHourActivity: [{ time: '2026-04-17T00:00:00.000Z', sent: 3, delivered: 2, failed: 1 }],
        topFailedEvents: [{ event: 'place.created', failedCount: 2, attempts: 5 }],
      },
    });

    expect(html).toContain('Olay Türleri Başarı Oranları');
    expect(html).toContain('place.created');
    expect(html).toContain('Toplam Webhooks');
  });
});
