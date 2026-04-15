// @ts-nocheck
import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';

// Map Web Vitals metric names to table columns
const METRIC_COLUMN: Record<string, string> = {
  TTFB: 'ttfb',
  FCP:  'fcp',
  LCP:  'lcp',
  DCL:  'dcl',
  Load: 'load',
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();

    if (!data.name || typeof data.value !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET: Aggregate performance metrics (admin only)
export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
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

    const result = await query(
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
      { name: 'LCP',  avg: Math.round(r.lcp_avg  || 0), p75: Math.round(r.lcp_p75  || 0), p95: Math.round(r.lcp_p95  || 0) },
      { name: 'FCP',  avg: Math.round(r.fcp_avg  || 0), p75: Math.round(r.fcp_p75  || 0), p95: Math.round(r.fcp_p95  || 0) },
      { name: 'TTFB', avg: Math.round(r.ttfb_avg || 0), p75: Math.round(r.ttfb_p75 || 0), p95: Math.round(r.ttfb_p95 || 0) },
      { name: 'DCL',  avg: Math.round(r.dcl_avg  || 0), p75: Math.round(r.dcl_p75  || 0), p95: Math.round(r.dcl_p95  || 0) },
      { name: 'Load', avg: Math.round(r.load_avg || 0), p75: Math.round(r.load_p75 || 0), p95: Math.round(r.load_p95 || 0) },
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
