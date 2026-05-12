import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson, safeErrorDetail, safeIntParam } from '../../../lib/api';

// Map Web Vitals metric names to table columns.
// CLS + INP migration 168 ile dedicated column'a alındı (Core Web Vitals 2024).
// DCL/Load legacy navigation timing — `web-vitals` library göndermiyor ama
// PerformanceMonitor'ın ilk vanilla impl'inde toplanıyordu; backward compat için tutuluyor.
const METRIC_COLUMN: Record<string, string> = {
  TTFB: 'ttfb',
  FCP:  'fcp',
  LCP:  'lcp',
  CLS:  'cls',
  INP:  'inp',
  DCL:  'dcl',
  Load: 'load',
};

interface PerformanceMetricPayload {
  name?: string;
  value?: number;
  url?: string;
}

interface PerformanceMetricAggregateRow {
  lcp_avg?: number | string | null;
  lcp_p75?: number | string | null;
  lcp_p95?: number | string | null;
  fcp_avg?: number | string | null;
  fcp_p75?: number | string | null;
  fcp_p95?: number | string | null;
  ttfb_avg?: number | string | null;
  ttfb_p75?: number | string | null;
  ttfb_p95?: number | string | null;
  cls_avg?: number | string | null;
  cls_p75?: number | string | null;
  cls_p95?: number | string | null;
  inp_avg?: number | string | null;
  inp_p75?: number | string | null;
  inp_p95?: number | string | null;
  dcl_avg?: number | string | null;
  dcl_p75?: number | string | null;
  dcl_p95?: number | string | null;
  load_avg?: number | string | null;
  load_p75?: number | string | null;
  load_p95?: number | string | null;
}

/**
 * Time-based metric rounding (ms): integer.
 * Used for: LCP, FCP, TTFB, INP, DCL, Load.
 */
function roundedMetric(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') return Math.round(parseFloat(value) || 0);
  return 0;
}

/**
 * Score-based metric rounding (0.0-1.0): 3 decimal places.
 * Used for: CLS (Cumulative Layout Shift).
 * Math.round() would zero out CLS values <0.5, breaking aggregation.
 */
function roundedScoreMetric(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = (await request.json()) as PerformanceMetricPayload;

    if (!data.name || typeof data.value !== 'number') {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'name ve value alanları zorunludur',
        type: '/problems/analytics-performance-validation',
        instance: '/api/analytics/performance',
      });
    }

    const col = METRIC_COLUMN[data.name];
    const rawUrl = data.url || request.headers.get('referer') || '';
    const url = rawUrl.substring(0, 2000);
    const rawUa = request.headers.get('user-agent') || '';
    const ua  = rawUa.substring(0, 500);

    if (col) {
      // Store as dedicated column for efficient aggregation
      await query(
        `INSERT INTO client_performance_metrics (url, user_agent, ${col}, metrics)
         VALUES ($1, $2, $3, $4)`,
        [url, ua, data.value, JSON.stringify({ [data.name]: data.value })]
      );
    } else {
      // Store unknown metric in JSONB
      await query(
        `INSERT INTO client_performance_metrics (url, user_agent, metrics)
         VALUES ($1, $2, $3)`,
        [url, ua, JSON.stringify({ [data.name]: data.value })]
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Analytics performance POST error:', error);
    return problemJson({
      status: 500,
      title: 'Performans Metriği Kaydedilemedi',
      detail: safeErrorDetail(error, 'Sunucu hatası, metric kaydedilemedi'),
      type: '/problems/analytics-performance-write-failed',
      instance: '/api/analytics/performance',
    });
  }
};

// GET: Aggregate performance metrics (admin only)
export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/analytics-performance-unauthorized',
      instance: '/api/analytics/performance',
    });
  }

  try {
    const url = new URL(request.url);
    const from   = url.searchParams.get('from');
    const to     = url.searchParams.get('to');
    const metric = url.searchParams.get('metric');

    const params: unknown[] = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (from) { where += ` AND timestamp >= $${idx++}`; params.push(new Date(from)); }
    if (to)   { where += ` AND timestamp <= $${idx++}`; params.push(new Date(to)); }

    // Aggregate (always) + optional per-URL breakdown — paralel
    const aggregateQuery = query<PerformanceMetricAggregateRow>(
      `SELECT
         AVG(lcp)  AS lcp_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp)  AS lcp_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lcp)  AS lcp_p95,
         AVG(fcp)  AS fcp_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp)  AS fcp_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fcp)  AS fcp_p95,
         AVG(ttfb) AS ttfb_avg, PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ttfb) AS ttfb_p75, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfb) AS ttfb_p95,
         AVG(cls)  AS cls_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls)  AS cls_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cls)  AS cls_p95,
         AVG(inp)  AS inp_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY inp)  AS inp_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY inp)  AS inp_p95,
         AVG(dcl)  AS dcl_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY dcl)  AS dcl_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dcl)  AS dcl_p95,
         AVG(load) AS load_avg, PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY load) AS load_p75, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load) AS load_p95
       FROM client_performance_metrics ${where}`,
      params
    );

    let urlResultPromise: Promise<{ rows: Array<{ url: string; samples: string | number; lcp_p75: string | number; inp_p75: string | number; cls_p75: string | number }> }> | null = null;
    if (url.searchParams.get('byUrl') === '1') {
      // Guard against NaN: parseInt('xyz') === NaN, Math.max(1, NaN) === NaN.
      // NaN as SQL bind value crashes/produces undefined behavior.
      const parsedLimit = safeIntParam(url.searchParams.get('limit'), 10, 0, 1_000_000);
      const parsedMinSamples = safeIntParam(url.searchParams.get('minSamples'), 5, 0, 1_000_000);
      const limit = Math.min(50, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 10));
      const minSamples = Math.max(1, Number.isFinite(parsedMinSamples) ? parsedMinSamples : 5);
      urlResultPromise = query<{ url: string; samples: string | number; lcp_p75: string | number; inp_p75: string | number; cls_p75: string | number }>(
        `SELECT url,
                COUNT(*) AS samples,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) AS lcp_p75,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY inp) AS inp_p75,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) AS cls_p75
         FROM client_performance_metrics
         ${where}
         GROUP BY url
         HAVING COUNT(*) >= $${idx}
         ORDER BY PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) DESC NULLS LAST
         LIMIT $${idx + 1}`,
        [...params, minSamples, limit]
      );
    }

    const [result, urlResult] = await Promise.all([aggregateQuery, urlResultPromise]);

    const r = result.rows[0] || {};

    const allMetrics = [
      // Core Web Vitals (2024 standard)
      { name: 'LCP',  avg: roundedMetric(r.lcp_avg), p75: roundedMetric(r.lcp_p75), p95: roundedMetric(r.lcp_p95) },
      { name: 'INP',  avg: roundedMetric(r.inp_avg), p75: roundedMetric(r.inp_p75), p95: roundedMetric(r.inp_p95) },
      { name: 'CLS',  avg: roundedScoreMetric(r.cls_avg), p75: roundedScoreMetric(r.cls_p75), p95: roundedScoreMetric(r.cls_p95) },
      // Supplementary metrics
      { name: 'FCP',  avg: roundedMetric(r.fcp_avg), p75: roundedMetric(r.fcp_p75), p95: roundedMetric(r.fcp_p95) },
      { name: 'TTFB', avg: roundedMetric(r.ttfb_avg), p75: roundedMetric(r.ttfb_p75), p95: roundedMetric(r.ttfb_p95) },
      // Legacy navigation timing (deprecated but kept for backward compat)
      { name: 'DCL',  avg: roundedMetric(r.dcl_avg), p75: roundedMetric(r.dcl_p75), p95: roundedMetric(r.dcl_p95) },
      { name: 'Load', avg: roundedMetric(r.load_avg), p75: roundedMetric(r.load_p75), p95: roundedMetric(r.load_p95) },
    ];

    const urlBreakdown = urlResult ? urlResult.rows.map(row => ({
      url: row.url || '(unknown)',
      samples: typeof row.samples === 'number' ? row.samples : parseInt(row.samples, 10) || 0,
      lcp_p75: roundedMetric(row.lcp_p75),
      inp_p75: roundedMetric(row.inp_p75),
      cls_p75: roundedScoreMetric(row.cls_p75),
    })) : undefined;

    return new Response(
      JSON.stringify({
        metrics: metric ? allMetrics.filter(m => m.name === metric) : allMetrics,
        urlBreakdown,
        from,
        to,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Analytics performance GET error:', error);
    return problemJson({
      status: 500,
      title: 'Performans Metriği Alınamadı',
      detail: safeErrorDetail(error, 'Sunucu hatası, metric okunamadı'),
      type: '/problems/analytics-performance-read-failed',
      instance: '/api/analytics/performance',
    });
  }
};
