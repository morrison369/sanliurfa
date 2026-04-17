import { describe, expect, it } from 'vitest';

import {
  formatLiveAnalyticsTime,
  getLiveAnalyticsErrorRateClass,
  getLiveAnalyticsResponseClass,
  normalizeLiveAnalyticsKpi,
  normalizeLiveAnalyticsMetrics,
  renderLiveAnalyticsDashboard,
} from '../live-analytics-dashboard';

describe('live analytics dashboard helpers', () => {
  it('normalizes metrics and kpi payloads', () => {
    const metrics = normalizeLiveAnalyticsMetrics({
      errorRate: 1.5,
      avgDuration: 180,
      p95Duration: 440,
      cacheHitRate: 77,
      slowRequests: 3,
      totalRequests: 1200,
      dbPool: { active: 2, idle: 8, waiting: 0, utilization: 20 },
    });
    const kpi = normalizeLiveAnalyticsKpi({
      kpis: [{ name: 'Aktif Kullanıcı', target_value: 100, unit: 'kişi' }],
      alertCount: 1,
    });

    expect(metrics?.dbPool?.utilization).toBe(20);
    expect(kpi?.alertCount).toBe(1);
  });

  it('returns semantic classes', () => {
    expect(getLiveAnalyticsErrorRateClass(1)).toBe('text-green-600');
    expect(getLiveAnalyticsErrorRateClass(3)).toBe('text-yellow-600');
    expect(getLiveAnalyticsResponseClass(600)).toBe('text-red-600');
  });

  it('renders dashboard html', () => {
    const html = renderLiveAnalyticsDashboard({
      connected: true,
      lastUpdate: '12:00:00',
      metrics: {
        errorRate: 1.5,
        avgDuration: 180,
        p95Duration: 440,
        cacheHitRate: 77,
        slowRequests: 3,
        totalRequests: 1200,
        slowestEndpoints: [{ endpoint: '/api/places', count: 4, avgDuration: 520 }],
        dbPool: { active: 2, idle: 8, waiting: 0, utilization: 20 },
      },
      kpi: {
        alertCount: 1,
        kpis: [{ id: '1', name: 'Aktif Kullanıcı', description: 'Canlı kullanıcılar', target_value: 100, unit: 'kişi' }],
      },
    });

    expect(html).toContain('Canlı Analitik Gösterge Paneli');
    expect(html).toContain('Aktif Kullanıcı');
    expect(html).toContain('/api/places');
  });

  it('formats update time in Turkish locale', () => {
    const time = formatLiveAnalyticsTime(new Date('2026-04-17T12:34:56'));
    expect(time).toContain(':');
  });
});
