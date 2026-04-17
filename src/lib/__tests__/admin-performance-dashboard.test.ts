import { describe, expect, it } from 'vitest';

import {
  extractAdminPerformanceDashboardData,
  normalizeAdminPerformanceTab,
  renderAdminPerformanceDashboard,
} from '../admin-performance-dashboard';

describe('admin performance dashboard helpers', () => {
  it('extracts nested optimization payload', () => {
    const data = extractAdminPerformanceDashboardData({
      success: true,
      data: {
        success: true,
        data: {
          recommendations: [{ priority: 'high', title: 'Optimize', description: 'Slow', action: 'Index' }],
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
          slowOperations: [],
          timestamp: '2026-04-17T08:10:00.000Z',
        },
      },
    });

    expect(data?.metrics.slowQueriesCount).toBe(4);
    expect(data?.recommendations[0]?.title).toBe('Optimize');
  });

  it('normalizes invalid tabs to summary', () => {
    expect(normalizeAdminPerformanceTab('recommendations')).toBe('recommendations');
    expect(normalizeAdminPerformanceTab('pages')).toBe('summary');
  });

  it('renders performance dashboard summary and artifact content', () => {
    const data = {
      recommendations: [{ priority: 'high', title: 'Optimize', description: 'Slow', action: 'Index' }],
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
        nightlyRegression: { status: 'degraded', generatedAt: '2026-04-16T08:00:00.000Z' },
      },
      artifactHealthSummary: {
        overall: 'degraded',
        healthyCount: 1,
        degradedCount: 1,
        blockedCount: 0,
        total: 2,
      },
      slowOperations: [{ type: 'api', message: '/api/admin', duration: 880, timestamp: '2026-04-17T08:12:00.000Z' }],
      timestamp: '2026-04-17T08:10:00.000Z',
    };

    const summaryHtml = renderAdminPerformanceDashboard({
      tab: 'summary',
      data: data as any,
      error: null,
    });
    const artifactsHtml = renderAdminPerformanceDashboard({
      tab: 'artifacts',
      data: data as any,
      error: null,
    });

    expect(summaryHtml).toContain('Yavaş sorgu');
    expect(summaryHtml).toContain('İndeks önerileri');
    expect(artifactsHtml).toContain('Genel durum');
    expect(artifactsHtml).toContain('releaseGate');
  });
});
