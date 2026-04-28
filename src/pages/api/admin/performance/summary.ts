/**
 * Performance Summary for Admin Dashboard
 * GET: Get comprehensive performance statistics and insights
 */

import type { APIRoute } from 'astro';
import { queryMany, queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

interface PerformanceStatsRow {
  total_metrics?: number | string | null;
  avg_ttfb: number | string | null;
  avg_fcp?: number | string | null;
  avg_lcp: number | string | null;
  avg_dcl?: number | string | null;
  avg_cls?: number | string | null;
  avg_inp?: number | string | null;
  p95_ttfb?: number | string | null;
  p95_fcp?: number | string | null;
  p95_lcp?: number | string | null;
  p75_cls?: number | string | null;
  p75_inp?: number | string | null;
  lcp_fails?: number | string | null;
  ttfb_fails?: number | string | null;
  dcl_fails?: number | string | null;
  cls_fails?: number | string | null;
  inp_fails?: number | string | null;
}

interface PagePerformanceRow {
  url: string;
  lcp_violations: number | string;
}

interface ConnectionStatsRow {
  connection_type: string | null;
}

interface DbStatsRow {
  active_connections: number | string | null;
  total_disk_reads: number | string | null;
  total_cache_hits: number | string | null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check admin access
    if (!locals.user || locals.user.role !== 'admin') {
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN
      );
    }

    // Get client performance metrics stats — Core Web Vitals 2024 standard (Migration 168 CLS+INP cols)
    const performanceStats = await queryOne<PerformanceStatsRow>(`
      SELECT
        COUNT(*) as total_metrics,
        AVG(ttfb) as avg_ttfb,
        AVG(fcp) as avg_fcp,
        AVG(lcp) as avg_lcp,
        AVG(dcl) as avg_dcl,
        AVG(cls) as avg_cls,
        AVG(inp) as avg_inp,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfb) as p95_ttfb,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fcp) as p95_fcp,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lcp) as p95_lcp,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) as p75_cls,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY inp) as p75_inp,
        COUNT(CASE WHEN lcp > 2500 THEN 1 END) as lcp_fails,
        COUNT(CASE WHEN ttfb > 600 THEN 1 END) as ttfb_fails,
        COUNT(CASE WHEN dcl > 3000 THEN 1 END) as dcl_fails,
        COUNT(CASE WHEN cls > 0.25 THEN 1 END) as cls_fails,
        COUNT(CASE WHEN inp > 500 THEN 1 END) as inp_fails
      FROM client_performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `).catch(() => null);

    // Get page-level performance
    const pagePerformance = await queryMany<PagePerformanceRow>(`
      SELECT
        url,
        COUNT(*) as samples,
        AVG(lcp) as avg_lcp,
        AVG(ttfb) as avg_ttfb,
        AVG(fcp) as avg_fcp,
        MAX(lcp) as max_lcp,
        COUNT(CASE WHEN lcp > 2500 THEN 1 END) as lcp_violations
      FROM client_performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY url
      ORDER BY avg_lcp DESC
      LIMIT 10
    `).catch(() => []);

    // Get connection type distribution
    const connectionStats = await queryMany<ConnectionStatsRow>(`
      SELECT
        connection_type,
        COUNT(*) as count,
        AVG(lcp) as avg_lcp,
        AVG(ttfb) as avg_ttfb
      FROM client_performance_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY connection_type
    `).catch(() => []);

    // Get database stats
    const dbStats = await queryOne<DbStatsRow>(`
      SELECT
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        (SELECT sum(heap_blks_read) FROM pg_statio_user_tables) as total_disk_reads,
        (SELECT sum(heap_blks_hit) FROM pg_statio_user_tables) as total_cache_hits
      FROM pg_stat_activity LIMIT 1
    `).catch(() => null);

    // Calculate cache hit ratio
    let cacheHitRatio = 0;
    if (dbStats?.total_cache_hits && dbStats?.total_disk_reads) {
      const cacheHits = toNumber(dbStats.total_cache_hits);
      const diskReads = toNumber(dbStats.total_disk_reads);
      const total = cacheHits + diskReads;
      cacheHitRatio = total > 0 ? (cacheHits / total) * 100 : 0;
    }

    // Generate recommendations — Google Web Vitals threshold-based (p75/p95)
    const recommendations: string[] = [];

    if (performanceStats?.p95_lcp && toNumber(performanceStats.p95_lcp) > 4000) {
      recommendations.push('LCP zayıf (p95 > 4s): görsel optimizasyonu, lazy loading, CDN kontrol edilmeli');
    } else if (performanceStats?.avg_lcp && toNumber(performanceStats.avg_lcp) > 2500) {
      recommendations.push('LCP iyileştirilmeli (avg > 2.5s): görsel optimizasyonu ve lazy loading kontrol edilmeli');
    }

    if (performanceStats?.p75_inp && toNumber(performanceStats.p75_inp) > 500) {
      recommendations.push('INP zayıf (p75 > 500ms): JavaScript main thread blocking, event handler optimizasyonu gerekli');
    } else if (performanceStats?.p75_inp && toNumber(performanceStats.p75_inp) > 200) {
      recommendations.push('INP iyileştirilmeli (p75 > 200ms): user interaction responsiveness kontrol edilmeli');
    }

    if (performanceStats?.p75_cls && toNumber(performanceStats.p75_cls) > 0.25) {
      recommendations.push("CLS zayıf (p75 > 0.25): layout shift'ler — image/iframe boyut belirtilmesi, font preload kontrol edilmeli");
    } else if (performanceStats?.p75_cls && toNumber(performanceStats.p75_cls) > 0.1) {
      recommendations.push("CLS iyileştirilmeli (p75 > 0.1): visual stability — reserve space for dynamic content");
    }

    if (performanceStats?.avg_ttfb && toNumber(performanceStats.avg_ttfb) > 600) {
      recommendations.push('Sunucu yanıt süresi yüksek: veritabanı sorguları ve cache katmanı kontrol edilmeli');
    }

    if (cacheHitRatio < 80) {
      recommendations.push('Cache hit oranı hedefin altında: Redis TTL ve invalidation kuralları gözden geçirilmeli');
    }

    const lcpViolationPages = pagePerformance.filter((p) => toNumber(p.lcp_violations) > 0);
    if (lcpViolationPages.length > 0) {
      recommendations.push(`${lcpViolationPages.length} sayfada LCP ihlali var`);
    }

    return apiResponse(
      {
        success: true,
        data: {
          performance: {
            stats: performanceStats,
            pages: pagePerformance,
            connectionTypes: connectionStats,
            database: {
              activeConnections: dbStats?.active_connections || 0,
              cacheHitRatio: cacheHitRatio.toFixed(2) + '%'
            }
          },
          recommendations,
          lastUpdated: new Date().toISOString()
        }
      },
      HttpStatus.OK
    );
  } catch (error) {
    logger.error('Performance summary failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Performans özeti alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};
