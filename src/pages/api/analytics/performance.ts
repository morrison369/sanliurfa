import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

// Map Web Vitals metric names to table columns
const METRIC_COLUMN: Record<string, string> = {
  TTFB: 'ttfb',
  FCP:  'fcp',
  LCP:  'lcp',
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
  dcl_avg?: number | string | null;
  dcl_p75?: number | string | null;
  dcl_p95?: number | string | null;
  load_avg?: number | string | null;
  load_p75?: number | string | null;
  load_p95?: number | string | null;
}

function roundedMetric(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') return Math.round(parseFloat(value) || 0);
  return 0;
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
    const url = data.url || request.headers.get('referer') || '';
    const ua  = request.headers.get('user-agent') || '';

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
      detail: error instanceof Error ? error.message : 'internal_server_error',
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

    const params: any[] = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (from) { where += ` AND timestamp >= $${idx++}`; params.push(new Date(from)); }
    if (to)   { where += ` AND timestamp <= $${idx++}`; params.push(new Date(to)); }

    const result = await query<PerformanceMetricAggregateRow>(
      `SELECT
         AVG(lcp)  AS lcp_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp)  AS lcp_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lcp)  AS lcp_p95,
         AVG(fcp)  AS fcp_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp)  AS fcp_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fcp)  AS fcp_p95,
         AVG(ttfb) AS ttfb_avg, PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ttfb) AS ttfb_p75, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfb) AS ttfb_p95,
         AVG(dcl)  AS dcl_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY dcl)  AS dcl_p75,  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dcl)  AS dcl_p95,
         AVG(load) AS load_avg, PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY load) AS load_p75, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load) AS load_p95
       FROM client_performance_metrics ${where}`,
      params
    );

    const r = result.rows[0] || {};

    const allMetrics = [
      { name: 'LCP',  avg: roundedMetric(r.lcp_avg), p75: roundedMetric(r.lcp_p75), p95: roundedMetric(r.lcp_p95) },
      { name: 'FCP',  avg: roundedMetric(r.fcp_avg), p75: roundedMetric(r.fcp_p75), p95: roundedMetric(r.fcp_p95) },
      { name: 'TTFB', avg: roundedMetric(r.ttfb_avg), p75: roundedMetric(r.ttfb_p75), p95: roundedMetric(r.ttfb_p95) },
      { name: 'DCL',  avg: roundedMetric(r.dcl_avg), p75: roundedMetric(r.dcl_p75), p95: roundedMetric(r.dcl_p95) },
      { name: 'Load', avg: roundedMetric(r.load_avg), p75: roundedMetric(r.load_p75), p95: roundedMetric(r.load_p95) },
    ];

    return new Response(
      JSON.stringify({
        metrics: metric ? allMetrics.filter(m => m.name === metric) : allMetrics,
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
      detail: error instanceof Error ? error.message : 'internal_server_error',
      type: '/problems/analytics-performance-read-failed',
      instance: '/api/analytics/performance',
    });
  }
};
